import { NextApiRequest, NextApiResponse } from 'next';
import { Status } from "~backend/Endpoint";
import getIdentity from '~backend/identity';
import { prisma } from "~database";

export default async function pluginFile(req: NextApiRequest, res: NextApiResponse) {
    switch (await getIdentity(req, res)) {
        case 'cannot-impersonate':
            return res.status(Status.UNAUTHORIZED).send('Not logged in');
        case 'cannot-impersonate':
            // Ok, fine, no reason to block access here.
    }

    const pluginId = req.query['pluginId'] as string;
    const [version = '', ...filePath] = req.query['filePath'] as string[];

    const file = await prisma.pluginFile.findFirst({
        where: { pluginId, filename: filePath.join('/'), plugin: { version } },
    });

    if (!file) {
        return res
            .status(404)
            .send(`throw new Error(${JSON.stringify(`${req.url} does not exist.`)})`);
    }

    return res
        .status(200)
        .setHeader('content-type', 'text/javascript')
        .setHeader('cache-control', 'public, max-age=31536000, immutable')
        .send(file.contents);
};
