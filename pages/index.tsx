import { Container, Stack, Typography, styled, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Box } from '@mui/system';
import type { NextPage } from 'next';
import { PropsWithChildren, ReactNode, useState } from 'react';
import { useGetRequest } from '../src/api/client/GetRequestHook';
import { UserEntity } from '../src/api/entities/UserEntity';
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
    const { data: meInfo } = useGetRequest<UserEntity<{ classes: 'deep' }>>('/api/me?include=classes');

    const [infoCategory, setInfoCategory] = useState('general');

    function getInfo() {
        switch (infoCategory) {
            case 'general': return generalInfo;
            case 'instructor': return instructorInfo(meInfo);
            case 'student': return studentInfo(meInfo);
        }
    }

    return <>
        <Stack direction="column" alignItems="center" p={4}>
            <Box sx={{
                width: "min(650px, calc(100vw - 96px))",
                mb: 8,
                mt: 2,
            }}>
                <NecodeLogo color="white" />
            </Box>
            {meInfo
                ? <ToggleButtonGroup value={infoCategory} exclusive onChange={(_, v) => v ? setInfoCategory(v) : null} sx={{ mb: 8 }}>
                    <ToggleButton value="general">General</ToggleButton>
                    <ToggleButton value="instructor">Instructor</ToggleButton>
                    <ToggleButton value="student">Student</ToggleButton>
                </ToggleButtonGroup>
                : null}
            <Container maxWidth="sm">
                {getInfo()}
            </Container>
        </Stack>
        <Footer />
    </>;
};

const generalInfo = <>
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
    <InfoSection omitParagraph title="What makes Necode special?">
        <p>
            Rather than creating a specific kind of interactive activity, for a specific programming language,
            Necode is designed to allow activities to be implemented independently of language implementations.
            Activities specify what features they require a language implementation to support,
            and language implementations specify what features they do support.
            If there&apos;s a match, that language will be available for the instructor to turn on for that activity.
        </p>
        <p>
            Additionally, Necode runs all user code in the browser. While this removes the ability to have trustworthy
            verification of task completion (Necode is NOT intended to be used for graded assignments), it provides many
            benefits over server-side computation:
            <ul>
                <li>Students can debug their code using native browser debugging tools</li>
                <li>Realtime multi-media activities are possible, including those with canvas graphics, audio, and even WebGL</li>
                <li>Intermittent server issues will not severely impact interactivity</li>
            </ul>
        </p>
    </InfoSection>
    <InfoSection omitParagraph title="What can do I do with Necode?">
        <p>
            As for what <em>you</em> can do, Necode is currently in development, and access is be limited to a few professors
            at Worcester Polytechnic Institute who have graciously agreed to use Necode in their classes, as well as the students who will be
            using Necode in those classes. If you are not in one of those groups, the only feature available to you is viewing this landing page.
        </p>
        <p>
            As for what Necode can do in general, the activity which is the closest to being production-ready allows for DOM programming in a manner
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
</>;

const canIUsePhoneText = <>
    Probably not. <SubtleLink target="_blank" rel="noopener" href="https://microsoft.github.io/monaco-editor/">Monaco</SubtleLink>,
    the code editor Necode currently uses on all devices, does not officially support touch interaction,
    and while some activities do have responsive layouts, that is also not a guarantee. Using a laptop is strongly recommended.
</>

const instructorInfo = (me: UserEntity<{ classes: 'deep' }> | undefined) => <>
    <InfoSection title="How can I use Necode in my classroom?">
        Please email Trevor at <SubtleLink href="mailto:tmpaley@wpi.edu">tmpaley@wpi.edu</SubtleLink>{' '}
        and cc Charlie at <SubtleLink href="mailto:cdroberts@wpi.edu">cdroberts@wpi.edu</SubtleLink>.
    </InfoSection>
    <InfoSection title="Can I use Necode for graded assignments?">
        We would <em>strongly</em> recommend against doing so. Necode intentionally sacrifices test secrecy and solution verifiability
        in exchange for students to be able to run their code on their own devices. In other words, any tests cases
        that you write would be both viewable and bypassable by an intrepid student. In fact, students can submit solutions
        without even running the test cases if they make direct API calls instead of using Necode&apos;s UI. The most
        Necode should ever be involved with grades is being used to determine student participation, and even that is discouarged.
    </InfoSection>
    <InfoSection title="Can my students use Necode on their phones?">
        {canIUsePhoneText}
    </InfoSection>
    <InfoSection title="Can I manage my classroom and activities on my phone?">
        No. While there are future plans to make Necode mobile-friendly from the student view, there are no plans
        to do the same for the instructor view. The manage classroom/activity pages will not work on a phone.
    </InfoSection>
    <InfoSection title="I have a classroom registered on Necode, but I lost the link.">
        {me?.attributes.classes.length! > 0
            ? <>
                Is it one of these?
                <ul>
                    {me?.attributes.classes.map(x => <li key={x.id}>
                        <SubtleLink href={`/classroom/${x.id}`}>{x.attributes.displayName}</SubtleLink>
                    </li>)}
                </ul>
            </>
            : "We'd love to help, but we can't find your classroom either. Are you logged in? If so, try refreshing."}
    </InfoSection>
</>;

const studentInfo = (me: UserEntity<{ classes: 'deep' }> | undefined) => <>
    <InfoSection title="My class is using Necode! How do I get started?" omitParagraph>
        <p>
            Your instructor should give you an invite code, which you can enter on the{' '}
            <SubtleLink href="/classroom/join">join classroom</SubtleLink> page. That will take you to
            the activity page, which will populate with an activity once your instructor starts one.
            You may want to bookmark the link to the activity page for your class, but if you ever forget it,
            you can always enter the code into the join classroom page again and it will send you right back!
        </p>
        {me?.attributes.classes.length! > 0
            ? <p>
                Or you can just come back here and select your class from this list <span style={{ whiteSpace: "nowrap" }}>/ᐠ｡ꞈ｡ᐟ\</span>
                <ul>
                    {me?.attributes.classes.map(x => <li key={x.id}>
                        <SubtleLink href={`/classroom/${x.id}`}>{x.attributes.displayName}</SubtleLink>
                    </li>)}
                </ul>
            </p>
            : null}
    </InfoSection>
    <InfoSection title="Can I use Necode on my phone?">
        {canIUsePhoneText}
    </InfoSection>
</>;

export default Home;
