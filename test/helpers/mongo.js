const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const startMongoReplicaSet = async (dbName) => {
  const replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  try {
    await mongoose.connect(replicaSet.getUri(), { dbName });
    return replicaSet;
  } catch (error) {
    await replicaSet.stop();
    throw error;
  }
};

const stopMongoReplicaSet = async (replicaSet) => {
  await mongoose.disconnect();
  await replicaSet.stop();
};

module.exports = { startMongoReplicaSet, stopMongoReplicaSet };
