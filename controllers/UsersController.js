import sha1 from 'sha1';
import { ObjectID } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static postNew(request, response) {
    const { email } = request.body;
    const { password } = request.body;
    if (!email) {
      response.status(400).json({ error: 'Missing email' });
      return;
    }
    if (!password) {
      response.status(400).json({ error: 'Missing password' });
      return;
    }
    const users = dbClient.db.collection('users');
    users.findOne({ email }, (err, user) => {
      if (user) {
        response.status(400).json({ error: 'Already exist' });
      } else {
        const hashedpassword = sha1(password);
        users.insertOne({
          email,
          password: hashedpassword,
        }).then((result) => {
          response.status(201).json({ id: result.insertedId, email });
        }).catch((err) => {
          console.log(err);
        });
      }
    });
  }

  static async getMe(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (userId) {
      const idObject = new ObjectID(userId);
      const users = dbClient.db.collection('users');
      users.findOne({ _id: idObject }, (err, user) => {
        if (user) {
          response.status(200).json({ id: userId, email: user.email });
        } else {
          response.status(401).json({ error: 'Unauthorized' });
        }
      });
    } else {
      response.status(401).json({ error: 'Unauthorized' });
    }
  }
}

module.exports = UsersController;
