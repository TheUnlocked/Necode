import { Container, Stack, Typography, styled } from '@mui/material';
import { Box } from '@mui/system';
import type { NextPage } from 'next';
import { PropsWithChildren, ReactNode } from 'react';
import Footer from '../src/components/Footer';
import NecodeLogo from '../src/components/NecodeLogo';
import SubtleLink from '../src/components/SubtleLink';

const InfoBox = styled('section')`
    padding-bottom: 32px;
`;

function InfoSection({ title, omitParagraph = false, children }: PropsWithChildren<{ title: ReactNode, omitParagraph?: boolean }>) {
    return <InfoBox>
        <Typography component="h2" variant="h4" fontWeight={500}>{title}</Typography>
        {omitParagraph ? children : <p>{children}</p>}
    </InfoBox>;
}

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
                <InfoSection title="What is Necode?">
                    Necode is experimental networked programming software designed to improve interactivity in a classroom setting.
                    Necode enables teachers to create in-class interactive programming activities where students can write code
                    and see it evaluated live, in order to facilitate learning for themselves and for their classmates.
                </InfoSection>
                <InfoSection title='How do you pronounce "Necode"?'>
                    Neh-code. Like the &quot;ne&quot; in &quot;network&quot; and then &quot;code.&quot;
                    Like &quot;<SubtleLink target="_blank" rel="noopener" href="https://translate.google.com/?sl=ja&tl=en&text=%E7%8C%AB&op=translate">neko</SubtleLink>&quot;
                    but if the &quot;ko&quot; was &quot;code.&quot;
                    If you can read IPA, /nɛkoʊd/ (assuming a GenAm accent).
                    It is NOT knee-code or neh-ko-deh or anything like that.
                </InfoSection>
                <InfoSection title="What makes Necode special?">
                    Rather than creating a specific kind of interactive activity, for a specific programming language,
                    Necode is designed to allow activities to be implemented independently of language implementations.
                    Activities specify what features they require a language implementation to support,
                    and language implementations specify what features they do support.
                    If there&apos;s a match, that language will be available for the instructor to turn on for that activity.
                </InfoSection>
                <InfoSection omitParagraph title="What can do I do with Necode?">
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
                <InfoSection title="I'd like to evaluate Necode for use in my class. How should I get in touch?">
                    Thank you very much for your interest! Feel free to shoot an email to Trevor at{' '}
                    <SubtleLink href="mailto:tmpaley@wpi.edu">tmpaley@wpi.edu</SubtleLink>, and cc Charlie at{' '}
                    <SubtleLink href="mailto:cdroberts@wpi.edu">cdroberts@wpi.edu</SubtleLink>.
                </InfoSection>
                <InfoSection title="I don't teach a class, but I'm still interested in Necode. Can I try it out?">
                    Currently no, unfortunately. While we&apos;d love to have a demo for guests to play around with Necode,
                    that&apos;s just not the best use of our limited development resources right now. We do plan to make Necode
                    open source in the near future though, so if you&apos;re willing to put in a bit of effort to get it running
                    on your local machine, you&apos;ll be able to use Necode as much as you want!
                </InfoSection>
                <InfoSection title="Is there a paper I can read?">
                    Not yet, but assuming everything goes to plan, one should be available in early March, 2022.
                </InfoSection>
            </Container>
        </Stack>
        <Footer />
    </>;
};

export default Home;
