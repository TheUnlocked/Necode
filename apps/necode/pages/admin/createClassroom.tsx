import { Skeleton, TextField } from "@mui/material";
import { NextPage } from "next";
import FormPage from "~ui/components/layouts/FormPage";
import { FormEventHandler, useCallback, useState } from "react";
import { ClassroomEntity } from "~api/entities/ClassroomEntity";
import { useRouter } from "next/router";
import { useGetRequestImmutable } from "~ui/hooks/useGetRequest";
import { UserEntity } from "~api/entities/UserEntity";
import AdminPageAlert from "~ui/components/AdminPageAlert";
import useNecodeFetch from '~ui/hooks/useNecodeFetch';

const MIN_NAME_LENGTH = 6;
const MAX_NAME_LENGTH = 100;

const Page: NextPage = () => {
    const router = useRouter();
    const { data: me, isLoading } = useGetRequestImmutable<UserEntity>('/api/me');

    const [displayName, setDisplayName] = useState<string>();

    const { upload } = useNecodeFetch();

    const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(async e => {
        e.preventDefault();
        
        const classroom = await upload<ClassroomEntity>('/api/classroom', {
            method: 'POST',
            body: JSON.stringify({
                displayName
            })
        });

        router.push(`/classroom/${classroom.id}`);

    }, [displayName, router, upload]);


    if (!me || !(me.attributes.rights === 'Admin' || me.attributes.rights === 'Faculty')) {
        return <FormPage title="Create Classroom" error hideSubmit>
            {isLoading
                ? <Skeleton animation="wave" variant="rectangular" height="56px" sx={{ borderRadius: 1 }} />
                : <AdminPageAlert />}
        </FormPage>;
    }

    return <FormPage
        title="Create Classroom"
        submitLabel="Create"
        formProps={{ onSubmit }} error={!displayName || displayName.length < MIN_NAME_LENGTH || displayName.length > MAX_NAME_LENGTH}>
        <TextField name="displayName" label="Display Name" variant="outlined"
            error={displayName !== undefined && (displayName.length < MIN_NAME_LENGTH || displayName.length > MAX_NAME_LENGTH)}
            helperText={
                !displayName || displayName.length < MIN_NAME_LENGTH ? `The display name must be at least ${MIN_NAME_LENGTH} characters`
                : displayName.length > MAX_NAME_LENGTH ? `The display name can be at most ${MAX_NAME_LENGTH} characters`
                : 'Looks good!'
            }
            onChange={x => setDisplayName(x.target.value)} />
    </FormPage>;
};

export default Page;