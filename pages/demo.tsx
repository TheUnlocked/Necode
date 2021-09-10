import { NextPage } from "next";
import { CreateTestActivity } from "../src/activities/test-based/CreateTestActivity";

const DemoPage: NextPage = () => {
    return <div style={{height: '100vh'}}><CreateTestActivity/></div>;
};

export default DemoPage;