import { createClient } from 'redis';
import { promisify } from 'util';

// A class the setsup connection with redis server.
class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => {
      console.log(`Redis client not connected to server:${err}`);
    });
  }

  // A method that returns the status of the connection to redis server.
  isAlive() {
    if (this.client.connected) {
      return true;
    }
    return false;
  }

  // A method that fetches the value of a given key from the redis server.
  async get(key) {
    const redisGet = promisify(this.client.get).bind(this.client);
    const value = await redisGet(key);
    return value;
  }

  // A method that stores a key value pair in the redis server.
  async set(key, value, seconds) {
    const redisSet = promisify(this.client.set).bind(this.client);
    await redisSet(key, value);
    await this.client.expire(key, seconds);
  }

  // A method that deletes a key value pair from the redis server.
  async del(key) {
    const redisDel = promisify(this.client.del).bind(this.client);
    await redisDel(key);
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
