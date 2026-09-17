/**
 * Prisma's duplicate-key error. Matched on the code rather than by importing
 * PrismaClientKnownRequestError, which is not exported from the generated
 * client's public entry point in this version.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}
