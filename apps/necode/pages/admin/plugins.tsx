import { Box, Button, Card, CardActions, CardContent, Skeleton, Stack, Typography } from "@mui/material";
import { NextPage } from "next";
import FormPage from "~ui/components/layouts/FormPage";
import { FormEventHandler, useCallback, useState } from "react";
import { useGetRequestImmutable } from "~shared-ui/hooks/useGetRequest";
import { UserEntity } from "~api/entities/UserEntity";
import AdminPageAlert from "~ui/components/AdminPageAlert";
import api from '~api/handles';
import { useApiFetch, useApiGet } from '~shared-ui/hooks/useApi';
import { useConfirm } from 'material-ui-confirm';
import { PluginEntity } from '~api/entities/PluginEntity';
import { set } from 'lodash/fp';

const Page: NextPage = () => {
    const { data: me, isLoading: meLoading } = useGetRequestImmutable<UserEntity>('/api/me');

    const { upload } = useApiFetch();

    const { data: plugins, mutate: mutatePlugins, isLoading: pluginsLoading } = useApiGet(api.plugins.all);

    const isLoading = meLoading || pluginsLoading;

    const [pluginFile, setPluginFile] = useState<File>();

    const onUploadPlugin: FormEventHandler<HTMLFormElement> = useCallback(async e => {
        e.preventDefault();

        if (!pluginFile) {
            return;
        }
        
        const plugin = await upload(api.plugins.create, {
            method: 'POST',
            body: pluginFile,
        });

        mutatePlugins(existing => {
            if (!existing) {
                return [plugin];
            }
            const priorIndex = existing.findIndex(x => x.attributes.name === plugin.attributes.name);
            if (priorIndex >= 0) {
                return set(`[${priorIndex}]`, plugin, existing);
            }
            return [...existing, plugin];
        }, { revalidate: true });

    }, [pluginFile, upload, mutatePlugins]);

    const confirm = useConfirm();

    async function tryUninstallPlugin(plugin: PluginEntity) {
        try {
            await confirm({ description: <>
                Are you sure you want to uninstall {plugin.attributes.displayName} (<code>{plugin.attributes.name}</code>)?
                This may break existing activities, including activities from other plugins which depend on languages or policies from this one.
            </> });
        }
        catch {
            return;
        }

        await upload(api.plugin(plugin.id), { method: 'DELETE' });
        mutatePlugins();
    }

    const selectFileHandler: FormEventHandler<HTMLInputElement> = e => {
        if (e.currentTarget.files?.length) {
            // files is not null and length is !== 0
            setPluginFile(e.currentTarget.files[0]);
        }
    };

    if (!me || !(me.attributes.rights === 'Admin' || me.attributes.rights === 'Faculty')) {
        return <FormPage title="Plugin Management" error hideSubmit>
            {isLoading
                ? <Skeleton animation="wave" variant="rectangular" height="56px" sx={{ borderRadius: 1 }} />
                : <AdminPageAlert />}
        </FormPage>;
    }

    return <FormPage
        title="Plugin Management"
        submitLabel="Upload"
        extraButtons={<>
            <Button variant="text" component="label">
                {pluginFile?.name ?? "Select Plugin..."}
                <input hidden accept="application/gzip" type="file" onInput={selectFileHandler} />
            </Button>
        </>}
        error={pluginFile === undefined}
        formProps={{ onSubmit: onUploadPlugin }}
    >
        {plugins?.map(x => <Card key={x.id}>
            <Stack direction="row">
                <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="div">{x.attributes.displayName}</Typography>
                    <Box color="text.secondary" component="code">{x.attributes.name}</Box>
                    <Typography color="text.secondary">Version {x.attributes.version}</Typography>
                </CardContent>
                <CardActions sx={{ alignSelf: "end" }}>
                    <Button variant="outlined" color="error" onClick={() => tryUninstallPlugin(x)}>Uninstall</Button>
                </CardActions>
            </Stack>
        </Card>)}
    </FormPage>;
};

export default Page;