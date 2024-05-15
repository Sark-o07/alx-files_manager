import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { ObjectID } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class FilesController {
  static async getUser(request) {
    const authToken = request.header('X-Token');
    const key = `auth_${authToken}`;
    const userId = await redisClient.get(key);
    if (userId) {
      const objectId = new ObjectID(userId);
      const users = dbClient.db.collection('users');
      const user = await users.findOne({ _id: objectId });
      if (user) {
        return user;
      }
      return null;
    }
    return null;
  }

  static async postUpload(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const { name } = request.body;
    const { type } = request.body;
    const { parentId } = request.body;
    const isPublic = request.body.isPublic || false;
    const { data } = request.body;

    if (!name) {
      return response.status(400).json({ error: 'Missing name' });
    }
    if (!type) {
      return response.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return response.status(400).json({ error: 'Missing data' });
    }
    const files = dbClient.db.collection('files');
    if (parentId) {
      const idObject = new ObjectID(parentId);
      const file = await files.findOne({ _id: idObject, userId: user._id });
      if (!file) {
        return response.status(400).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder ' });
      }
    }
    if (type === 'folder') {
      files.insertOne(
        {
          userId: user._id,
          name,
          type,
          parentId: parentId || 0,
          isPublic,
        },
      ).then((result) => response.status(201).json(
        {
          id: result.insertedId,
          userId: user._id,
          name,
          type,
          isPublic,
          parentId: parentId || 0,
        },
      )).catch((error) => {
        console.log(error);
      });
    } else {
      const filePath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const fileName = `${filePath}/${uuidv4()}`;
      const buff = Buffer.from(data, 'base64');
      try {
        try {
          await fs.mkdir(filePath);
        } catch (error) {
        //   console.log(error);
        }
        await fs.writeFile(fileName, buff, 'utf-8');
      } catch (error) {
        console.log(error);
      }
      files.insertOne(
        {
          userId: user._id,
          name,
          type,
          isPublic,
          parentId: parentId || 0,
          localPath: fileName,
        },
      ).then((result) => response.status(201).json(
        {
          id: result.insertedId,
          userId: user._id,
          name,
          type,
          isPublic,
          parentId: parentId || 0,
          localPath: fileName,

        },
      ));
    }
    return null;
  }
}
module.exports = FilesController;
