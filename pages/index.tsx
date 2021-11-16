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
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed molestie mauris pulvinar magna suscipit lacinia. Pellentesque a lectus nec diam ullamcorper dictum in sed massa. Vivamus eget erat justo. Praesent eget vulputate arcu. Nulla facilisi. Morbi quis dolor ac neque posuere ullamcorper. Quisque volutpat lorem vitae enim vulputate, at aliquet neque scelerisque. Aliquam commodo dolor nec turpis porta pellentesque hendrerit non tortor. Vestibulum vitae interdum ligula. Pellentesque sit amet sem nec purus tincidunt posuere. Quisque dictum dolor vitae nibh placerat lacinia.

                    Donec blandit varius lorem, et lacinia turpis suscipit et. Maecenas euismod congue nibh, eget lacinia nulla porta vitae. Donec hendrerit cursus lacus non iaculis. Vestibulum nec aliquam dui. Suspendisse massa mauris, rutrum in lobortis et, bibendum sit amet sem. Curabitur eros tortor, laoreet id elit nec, dapibus tempus nisi. Maecenas iaculis consectetur odio nec rutrum. Fusce egestas risus nibh, vel faucibus lectus pellentesque id. Sed ante tortor, volutpat ut consequat quis, maximus facilisis nunc. Duis aliquam nulla ligula, ac sollicitudin turpis tempus eu. Fusce diam ligula, accumsan lacinia accumsan volutpat, auctor eget dui. Duis lectus velit, auctor nec felis et, elementum luctus orci. Proin vehicula gravida leo, sed eleifend ipsum dictum ut. Ut at enim vulputate, cursus felis vel, tincidunt ante. Suspendisse at ex quam.                </p>
                </InfoSection>
                <InfoSection>
                    <Typography component="h2" variant="h4" fontWeight={500}>How do you pronounce &quot;Necode&quot;?</Typography>
                    <p>
                        Neh-code. Like the &quot;ne&quot; in &quot;net&quot; and then &quot;code.&quot;
                        Like &quot;<SubtleLink target="_blank" rel="noopener" href="https://translate.google.com/?sl=ja&tl=en&text=%E7%8C%AB&op=translate">neko</SubtleLink>&quot; but if the &quot;ko&quot; was &quot;code.&quot;
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
