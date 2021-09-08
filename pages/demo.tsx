import { NextPage } from "next";
import { CreateTestActivity } from "../activities/test-based/CreateTestActivity";

const DemoPage: NextPage = () => {
    return <div style={{height: '100vh'}}><CreateTestActivity/></div>;
};

export default DemoPage;