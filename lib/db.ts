import neo4j, { Driver, type RecordShape } from "neo4j-driver";
import { DbQueryError, DbUnreachableError, isConnectivityError } from "./errors";

let driver: Driver | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      requireEnv("NEO4J_URI"),
      neo4j.auth.basic(requireEnv("NEO4J_USERNAME"), requireEnv("NEO4J_PASSWORD")),
      {
        maxConnectionPoolSize: 20, // free-tier instance allows 200 connections total
        connectionAcquisitionTimeout: 10_000,
        connectionTimeout: 10_000,
      }
    );
  }
  return driver;
}

/**
 * Run a parameterized read query and map each record.
 * All Cypher in this app flows through here (or runWrite) — parameters only,
 * never string interpolation.
 */
export async function runRead<T>(
  cypher: string,
  params: Record<string, unknown>,
  map: (record: RecordShape) => T
): Promise<T[]> {
  const session = getDriver().session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => map(r.toObject()));
  } catch (err) {
    if (isConnectivityError(err)) throw new DbUnreachableError(err);
    throw new DbQueryError("Query failed", err);
  } finally {
    await session.close();
  }
}

export async function runWrite(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<void> {
  const session = getDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await session.run(cypher, params);
  } catch (err) {
    if (isConnectivityError(err)) throw new DbUnreachableError(err);
    throw new DbQueryError("Write failed", err);
  } finally {
    await session.close();
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    await getDriver().verifyConnectivity();
    return true;
  } catch {
    return false;
  }
}

/** Convert neo4j Integer (or plain number) to a JS number for JSON responses. */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (neo4j.isInt(value)) return value.toNumber();
  return Number(value);
}
