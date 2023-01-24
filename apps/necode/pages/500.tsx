import { NextPage } from "next";
import { Stack, Typography, Link, styled } from "@mui/material";
import { MouseEvent } from "react";
import dedent from "dedent-js";
import SubtleLink from "common/components/SubtleLink";

const AsciiArt = styled('pre')`
    text-align: left;
`;

const InternalServerErrorPage: NextPage = () => {
    function goBack(e: MouseEvent) {
        e.preventDefault();
        window.history.back();
    }
    
    return <Stack direction="row" justifyContent="center" alignItems="center" gap={3} sx={{
        position: "absolute",
        top: "var(--header-height)",
        left: 0,
        height: "calc(90vh - var(--header-height))",
        width: "calc(100vw - 64px)",
        mx: 4,
        textAlign: "center"
    }}>
        <Stack direction="column" alignItems="center">
            <Typography variant="h1" fontSize="max(10vw, 6rem)" fontWeight="900">500</Typography>
            <Typography variant="h2" fontSize="max(3vw, 3rem)">Internal Server Error</Typography>
            <Typography variant="body1" fontSize="max(1vw, 1.2rem)" my={2}>
                Look, a cat! It wants you to <Link href="#" onClick={goBack}>go back</Link>!
            </Typography>
        </Stack>
        <AsciiArt sx={{
            fontSize: "clamp(1.5rem, 3vw, 2.5rem)"
        }}>{
       `  ／|、 `}<SubtleLink href="#" onClick={goBack}>m̵̧̎̊ͅe̸͉͋͒o̶̘͔̓w̵̩͓͘</SubtleLink>{dedent`\n
        ﾞ（ﾟ､ ｡ ７
          |、ﾞ ~ヽ
          じしf_, )ノ
        `}</AsciiArt>
    </Stack>;
};

export default InternalServerErrorPage;