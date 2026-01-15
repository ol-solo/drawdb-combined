import express from 'express';
import {
  create,
  del,
  get,
  getCommits,
  update,
  getRevision,
  getRevisionsForFile,
} from '../controllers/gist-controller';

const gistRouter = express.Router();

gistRouter.post('/', create);
gistRouter.get('/:id', get);
gistRouter.delete('/:id', del);
gistRouter.patch('/:id', update);
gistRouter.get('/:id/commits', getCommits);
gistRouter.get('/:id/:sha', getRevision);
gistRouter.get('/:id/file-versions/:file', getRevisionsForFile);

export { gistRouter };
