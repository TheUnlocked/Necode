import { Container, Link, Stack, Typography, styled } from '@mui/material';
import { Box } from '@mui/system';
import type { NextPage } from 'next';
import Footer from '../src/components/Footer';
import NecodeLogo from '../src/components/NecodeLogo';
import SubtleLink from '../src/components/SubtleLink';

const InfoSection = styled('section')`
    padding-bottom: 32px;
`;

const Home: NextPage = () => {
    return <>
        <Stack direction="column" alignItems="center" p={4}>
            <Box sx={{
                width: "min(650px, calc(100vw - 96px))",
                mb: 8,
                mt: 2,
            }}>
                <NecodeLogo color="white" />
            </Box>
            <Container maxWidth="sm">
                <InfoSection>
                    <Typography component="h2" variant="h4" fontWeight={500}>What is Necode?</Typography>
                    <p>
                        Necode is experimental networked programming software designed to improve interactivity in a classroom setting.
                        Necode enables teachers to create in-class interactive programming activities where students can write code
                        and see it evaluated live, in order to facilitate learning for themselves and for their classmates.
                    </p>
                </InfoSection>
                <InfoSection>
                    <Typography component="h2" variant="h4" fontWeight={500}>What makes Necode special?</Typography>
                    <p>
                        Rather than creating a specific kind of interactive activity, for a specific programming language,
                        Necode is designed to allow activities to be implemented independently of language implementations.
                        Activities specify what features they require a language implementation to support,
                        and language implementations specify what features they do support.
                        If there&apos;s a match, that language will be available for the instructor to turn on for that activity.
                    </p>
                </InfoSection>
                <InfoSection>
                    <Typography component="h2" variant="h4" fontWeight={500}>What can do I do with Necode?</Typography>
                    <p>
                        Currently Necode is in development, and access will be limited to a few professors at Worcester Polytechnic Institute
                        who have graciously agreed to use Necode in their classes, as well as the students who will be using Necode in those classes.
                    </p>
                    <p>
                        Currently, the activity which is the closest to being production-ready allows for DOM programming in a manner
                        similar to websites like <SubtleLink target="_blank" rel="noopener" href="https://codesandbox.io/">CodeSandbox</SubtleLink>{' '}
                        or <SubtleLink target="_blank" rel="noopener" href="https://codepen.io/">CodePen</SubtleLink>, but it also supports
                        automated tests which can be written by the instructor using a custom TypeScript DSL, as well as the ability for
                        students to write in Python or TypeScript instead of JavaScript, depending on what the instructor is trying to teach.
                    </p>
                </InfoSection>
                <InfoSection>
                    <Typography component="h2" variant="h4" fontWeight={500}>How do you pronounce &quot;Necode&quot;?</Typography>
                    <p>
                        Neh-code. Like the &quot;ne&quot; in &quot;net&quot; and then &quot;code.&quot;
                        Like &quot;<SubtleLink target="_blank" rel="noopener" href="https://translate.google.com/?sl=ja&tl=en&text=%E7%8C%AB&op=translate">neko</SubtleLink>&quot;
                        but if the &quot;ko&quot; was &quot;code.&quot;
                        If you can read IPA, /nekoʊd/ (or /nekəʊd/ if you&apos;re British).
                        It is NOT knee-code or neh-ko-deh or anything similar to those. Neh. Code.
                    </p>
                </InfoSection>
            </Container>
        </Stack>
        <Footer />
    </>;
};

export default Home;
