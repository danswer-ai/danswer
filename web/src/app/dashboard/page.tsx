import { redirect } from "next/navigation";
import { UserDropdown } from "@/components/UserDropdown";
import {
    FetchAssistantsResponse,
    fetchAssistantsSS,
} from "@/lib/assistants/fetchAssistantsSS";
import { User } from "@/lib/types";
import {
    AuthTypeMetadata,
    getAuthTypeMetadataSS,
    getCurrentUserSS,
} from "@/lib/userSS";
import DashboardSideBar from "./DashboardSideBar";
import AssistantList from "./AssistantList";

export default async function Dashboard() {
    const tasks = [
        getAuthTypeMetadataSS(),
        getCurrentUserSS(),
        fetchAssistantsSS()
    ];

    let results: (
        | User
        | FetchAssistantsResponse
        | AuthTypeMetadata
        | null
    )[] = [null, null, null];
    try {
        results = await Promise.all(tasks);
    } catch (e) {
        console.log(`Some fetch failed for the main search page - ${e}`);
    }

    const authTypeMetadata = results[0] as AuthTypeMetadata | null;
    const user = results[1] as User | null;
    const [initialAssistantsList, assistantsFetchError] = results[2] as FetchAssistantsResponse;
    
    const authDisabled = authTypeMetadata?.authType === "disabled";
    if (!authDisabled && !user) {
        return redirect("/auth/login");
    }

    return (
        <>
            <div className="flex">
                <DashboardSideBar />
                <div className="flex-1 p-5 h-screen overflow-auto">
                    <div className="flex justify-end">
                        <UserDropdown user={user} />
                    </div>
                    {/* Main content goes here */}
                    <div className="flex flex-col items-center min-h-screen p-4">
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