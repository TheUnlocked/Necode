import { prisma } from '~database';
import { makePluginEntity } from '~api/entities/PluginEntity';
import { endpoint, Status } from '~backend/Endpoint';
import { hasScope } from '~backend/scopes';

const apiPluginOne = endpoint(makePluginEntity, ['pluginId'], {
    type: 'entity',
    GET: {
        loginValidation: true,
        handler: async ({ query: { pluginId } }, ok, fail) => {
            const plugin = await prisma.plugin.findUnique({ where: { id: pluginId } });

            if (!plugin) {
                return fail(Status.NOT_FOUND);
            }

            return ok(makePluginEntity(plugin));
        }
    },
    DELETE: {
        loginValidation: true,
        handler: async ({ session, query: { pluginId } }, ok, fail) => {
            if (!await hasScope(session!.user.id, 'plugin:uninstall', { pluginId })) {
                return fail(Status.FORBIDDEN);
            }

            if (await prisma.plugin.count({ where: { id: pluginId } }) === 0) {
                return fail(Status.NOT_FOUND);
            }

            await prisma.plugin.delete({ where: { id: pluginId } });

            return ok();
        }
    },
});

export default apiPluginOne;
