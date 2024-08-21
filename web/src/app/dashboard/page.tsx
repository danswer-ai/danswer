import { UserDropdown } from "@/components/UserDropdown";
import {
    FetchAssistantsResponse,
    fetchAssistantsSS,
} from "@/lib/assistants/fetchAssistantsSS";
import { User } from "@/lib/types";
import {
    getCurrentUserSS,
} from "@/lib/userSS";
import DashboardSideBar from "./DashboardSideBar";
import AssistantList from "./AssistantList";

export default async function Dashboard() {
    const tasks = [
        getCurrentUserSS(),
        fetchAssistantsSS()
    ];

    let results: (
        | User
        | FetchAssistantsResponse
        | null
    )[] = [null, null, null];
    try {
        results = await Promise.all(tasks);
    } catch (e) {
        console.log(`Some fetch failed for the main search page - ${e}`);
    }

    const user = results[0] as User | null;
    const [initialAssistantsList, assistantsFetchError] = results[1] as FetchAssistantsResponse;
    
    return (
        <>
            <div className="flex">
                <DashboardSideBar />
                <div className="flex-1 p-5">
                    <div className="flex justify-end">
                        <UserDropdown user={user} />
                    </div>
                    {/* Main content goes here */}
                    <div className="flex flex-col items-center  min-h-screen p-4">
                        <div className="text-center mb-8">
                            <h1 className="text-4xl font-bold text-gray-800">Welcome</h1>
                            <p className="text-lg text-gray-600">Please select the plugin you would like to use</p>
                        </div>
                        
                        <AssistantList assistants={initialAssistantsList} />
                    </div>

                </div>
            </div>
        </>
    )
}