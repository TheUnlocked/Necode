import { Link, LinkTypeMap } from "@mui/material";
import { OverrideProps } from '@mui/material/OverridableComponent';
import NextLink from "next/link";

export function UnstyledLink(props: OverrideProps<LinkTypeMap<{}, "a">, typeof NextLink>) {
    return <Link component={NextLink} {...props} />;
}

export default function SubtleLink(props: OverrideProps<LinkTypeMap<{}, "a">, typeof NextLink>) {
    return <UnstyledLink {...props} sx={{
        color: ({ palette }) => palette.text.primary,
        textDecorationColor: ({ palette }) => palette.text.primary,
        ...props.sx
    }} />;
}
