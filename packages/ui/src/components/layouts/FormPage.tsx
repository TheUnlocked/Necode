import { LoadingButton } from "@mui/lab";
import { Container, Divider, Stack, Typography, Box } from "@mui/material";
import { BaseProps } from "@mui/material/OverridableComponent";
import type { BoxTypeMap } from "@mui/system";
import { ComponentProps, PropsWithChildren, ReactNode, useState } from "react";
import Footer from "../Footer";

export default function FormPage(props: PropsWithChildren<{
    title: string,
    error?: boolean,
    submitLabel?: string,
    hideSubmit?: boolean,
    extraButtons?: ReactNode,
    formProps?: Omit<ComponentProps<'form'>, keyof BaseProps<BoxTypeMap>>,
}>) {
    const [submitLoading, setSubmitLoading] = useState(false);

    const trueFormProps = { ...props.formProps ?? {} };
    if (props.formProps?.onSubmit) {
        trueFormProps.onSubmit = async function(...args) {
            setSubmitLoading(true);
            try {
                await (props.formProps?.onSubmit?.apply(this, args) as undefined | Promise<undefined>);
            }
            finally {
                setSubmitLoading(false);
            }
        };
    }

    return <>
        <Container maxWidth="sm">
            <Typography sx={{ marginTop: 6 }} variant="h2" fontWeight="500">{props.title}</Typography>
            <Divider sx={{ marginTop: 2, marginBottom: 2 }} />
            <Box
                component="form"
                autoComplete="off"
                noValidate
                {...trueFormProps}
                sx={{ m: 2, marginTop: 4 }}
            >
                <Stack spacing={3} sx={{
                    alignItems: "left"
                }}>
                    {props.children}
                    <Stack direction="row" justifyContent="end" spacing={2}>
                        {props.extraButtons}
                        {props.hideSubmit ? undefined :
                            <LoadingButton variant="contained" size="large" type="submit" disabled={props.error} loading={submitLoading}>
                                {props.submitLabel ?? "Submit"}
                            </LoadingButton>
                        }
                    </Stack>
                </Stack>
            </Box>
        </Container>
        <Footer />
    </>;
}