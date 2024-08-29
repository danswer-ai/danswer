import { BasicClickable } from "@/components/BasicClickable";
import Link from "next/link";
import React from "react";
import { FaBrain } from "react-icons/fa";
import SideBarHeader from "./SideBarHeader";

export default function DashboardSideBar() {

    return (
        <div className="
                w-64
                flex
                bg-background-weak
                3xl:w-72
                border-r 
                border-border 
                flex 
                flex-col 
                h-screen
                transition-transform">
            {/* Logo Section */}
            <div className="mx-4 my-6">
                <SideBarHeader />
            </div>
            {/* Navigation Links */}
            <nav className="w-full px-3 mt-2">
                <Link href="/assistants/mine">
                    <BasicClickable fullWidth>
                        <div className="flex items-center text-default font-medium">
                            <FaBrain className="ml-1 mr-2" /> Manage Plugins
                        </div>
                    </BasicClickable>
                </Link>
            </nav>
        </div>
    )
}
