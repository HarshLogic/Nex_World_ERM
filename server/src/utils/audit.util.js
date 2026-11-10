/**
 * Append-Only Audit Logging Utility
 */

/**
 * Creates an activity log entry.
 * @param {Object} params
 * @param {Object} params.prisma - Prisma instance or transaction client
 * @param {string|null} [params.userId=null] - ID of user performing the action
 * @param {string} params.action - Action verb (e.g. "CREATE", "CHECKOUT", "STOCK_ADJUSTMENT")
 * @param {string} params.module - Domain module (e.g. "POS", "INVENTORY", "PRODUCTS")
 * @param {string} params.description - Human-readable explanation
 * @param {string|null} [params.entityId=null] - ID of target entity
 * @param {string|null} [params.ipAddress=null] - Client IP address
 * @param {Object|null} [params.metadata=null] - Contextual metadata
 */
async function logActivity({
  prisma,
  userId = null,
  action,
  module,
  description,
  entityId = null,
  ipAddress = null,
  metadata = null,
}) {
  try {
    return await prisma.activityLog.create({
      data: {
        userId,
        action,
        module,
        description,
        entityId: entityId ? String(entityId) : null,
        ipAddress,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    // Non-blocking for primary transaction unless strict audit mode is enabled
    console.error(`[AUDIT LOG FAILED]: ${err.message}`, { action, module, description });
    return null;
  }
}

module.exports = {
  logActivity,
};

