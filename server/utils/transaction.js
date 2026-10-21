const mongoose = require('mongoose');

let supportsTransactionCache = null;

/**
 * Checks whether the connected MongoDB instance supports multi-document transactions
 * (requires replica set or mongos; throws on standalone MongoDB).
 */
const checkTransactionSupport = async () => {
  if (supportsTransactionCache !== null) {
    return supportsTransactionCache;
  }

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    // A query using the session is needed to test transaction capability
    await mongoose.connection.db.collection('__tx_test').findOne({}, { session });
    await session.abortTransaction();
    session.endSession();
    supportsTransactionCache = true;
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (cleanupErr) {
        // ignore cleanup error
      }
    }
    supportsTransactionCache = false;
  }

  return supportsTransactionCache;
};

/**
 * Executes a function within a MongoDB session/transaction where supported.
 * Passes `session` if supported, or `null` if standalone.
 */
const withTransaction = async (workFn) => {
  const isSupported = await checkTransactionSupport();

  if (isSupported) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await workFn(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } else {
    return await workFn(null);
  }
};

module.exports = {
  checkTransactionSupport,
  withTransaction
};
