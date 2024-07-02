"use client"

import { useContext, useRef, useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Header } from "@/components/header/Header";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import FunctionalWrapper from "../chat/shared_chat_search/FunctionalWrapper";
import { UserDropdown } from "@/components/UserDropdown";
import { TbLayoutSidebarLeftExpand } from "react-icons/tb";
import { useRouter } from "next/navigation";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import ResizableSection from "@/components/resizable/ResizableSection";
import { ChatSidebar } from "@/app/chat/sessionSidebar/ChatSidebar";
import { SIDEBAR_WIDTH_CONST } from "@/lib/constants";
import { CCPairBasicInfo, DocumentSet, Tag, User } from "@/lib/types";
import { SearchType } from "@/lib/search/interfaces";
import { Persona } from "../admin/assistants/interfaces";
import { ChatSession } from "../chat/interfaces";
import { AuthTypeMetadata } from "@/lib/userSS";

// ... (keep all the interface definitions and dynamic imports from the previous version)

interface SearchSectionProps {
    querySessions: ChatSession[];
    user: User | null;
    ccPairs: CCPairBasicInfo[];
    documentSets: DocumentSet[];
    personas: Persona[];
    tags: Tag[];
    defaultSearchType: SearchType;
}

interface ApiKeyModalProps {
    user: User | null;
}

interface WelcomeModalProps {
    user: User | null;
}

interface NoCompleteSourcesModalProps {
    ccPairs: CCPairBasicInfo[];
}




const DynamicSearchSection = dynamic(() => 
    import('@/components/search/SearchSection').then((mod) => {
      const Component = mod.SearchSection || mod.default;
      return { default: (props: SearchSectionProps) => <Component {...props} /> };
    }), {
    loading: () => <p>Loading search...</p>,
  });
  
  const DynamicApiKeyModal = dynamic(() => 
    import('@/components/llm/ApiKeyModal').then((mod) => {
      const Component = mod.ApiKeyModal || mod.default;
      return { default: (props: ApiKeyModalProps) => <Component {...props} /> };
    }), {
    ssr: false,
  });
  

  
  const DynamicNoSourcesModal = dynamic(() => 
    import('@/components/initialSetup/search/NoSourcesModal').then((mod) => {
      const Component = mod.NoSourcesModal || mod.default;
      return { default: () => <Component /> };
    }), {
    ssr: false,
  });
  
  const DynamicNoCompleteSourcesModal = dynamic(() => 
    import('@/components/initialSetup/search/NoCompleteSourceModal').then((mod) => {
      const Component = mod.NoCompleteSourcesModal || mod.default;
      return { default: (props: NoCompleteSourcesModalProps) => <Component {...props} /> };
    }), {
    ssr: false,
  });
  
  const DynamicChatPopup = dynamic(() => 
    import('../chat/ChatPopup').then((mod) => {
      const Component = mod.ChatPopup || mod.default;
      return { default: () => <Component /> };
    }), {
    ssr: false,
  });
  
export default function HomeClient({ user, authTypeMetadata, initialData }: {
    user: User | null, authTypeMetadata: AuthTypeMetadata | null, initialData: {
        ccPairs: CCPairBasicInfo[];
        documentSets: DocumentSet[];
        personas: Persona[];
        tags: Tag[];
        querySessions: ChatSession[];
        searchTypeDefault: string;
        hasAnyConnectors: boolean;
        shouldShowWelcomeModal: boolean;
        shouldDisplayNoSourcesModal: boolean;
        shouldDisplaySourcesIncompleteModal: boolean;
    }
}) {
    const router = useRouter();
    const settings = useContext(SettingsContext);
    const sidebarElementRef = useRef<HTMLDivElement>(null);
    const innerSidebarElementRef = useRef<HTMLDivElement>(null);

    const [showDocSidebar, setShowDocSidebar] = useState(false);
    const [usedSidebarWidth, setUsedSidebarWidth] = useState<number>(
        300 || parseInt(SIDEBAR_WIDTH_CONST)
    );

    useEffect(() => {
        if (settings?.settings?.search_page_enabled === false) {
            router.push("/chat");
        }
    }, [settings, router]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey) {
                switch (event.key.toLowerCase()) {
                    case 'e':
                        event.preventDefault();
                        setShowDocSidebar(prev => !prev);
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const toggleSidebar = () => {
        setShowDocSidebar(prevState => !prevState);
    };

    const updateSidebarWidth = (newWidth: number) => {
        setUsedSidebarWidth(newWidth);
        if (sidebarElementRef.current && innerSidebarElementRef.current) {
            sidebarElementRef.current.style.transition = "";
            sidebarElementRef.current.style.width = `${newWidth}px`;
            innerSidebarElementRef.current.style.width = `${newWidth}px`;
        }
    };

    if (authTypeMetadata?.authType !== "disabled" && !user) {
        router.push('/auth/login');
        return null;
    }

    if (user && !user.is_verified && authTypeMetadata?.requiresVerification) {
        router.push('/auth/waiting-on-verification');
        return null;
    }

    return (
        <>
            <div
                ref={sidebarElementRef}
                className={`flex-none absolute left-0 z-[100] overflow-y-hidden sidebar bg-background-weak h-screen`}
                style={{ width: showDocSidebar ? usedSidebarWidth : 0 }}
            >
                <ResizableSection
                    updateSidebarWidth={updateSidebarWidth}
                    intialWidth={usedSidebarWidth}
                    minWidth={200}
                    maxWidth={300 || undefined}
                >
                    <div className="w-full relative">
                        <ChatSidebar
                            initialWidth={usedSidebarWidth}
                            ref={innerSidebarElementRef}
                            closeSidebar={() => toggleSidebar()}
                            existingChats={initialData.querySessions}
                        />
                    </div>
                </ResizableSection>
            </div>

            <div className="left-0 sticky top-0 z-10 w-full bg-opacity-30 backdrop-blur-sm flex">
                <div className="mt-2 flex w-full">
                    {!showDocSidebar && (
                        <button
                            className="ml-4 mt-auto"
                            onClick={() => toggleSidebar()}
                        >
                            <TbLayoutSidebarLeftExpand size={24} />
                        </button>
                    )}
                    <div className="flex mr-4 ml-auto my-auto">
                        <UserDropdown user={user} />
                    </div>
                </div>
            </div>

            <div className="m-3">
                <HealthCheckBanner />
            </div>

            <FunctionalWrapper>
                <div className="relative flex flex-col items-center min-h-screen">
                    <div className="w-full">
                        <Suspense fallback={<div>Loading search...</div>}>
                            <DynamicSearchSection
                                querySessions={initialData.querySessions}
                                user={user}
                                ccPairs={initialData.ccPairs}
                                documentSets={initialData.documentSets}
                                personas={initialData.personas}
                                tags={initialData.tags}
                                defaultSearchType={initialData.searchTypeDefault}
                            />
                        </Suspense>
                    </div>
                </div>
            </FunctionalWrapper>

            <Suspense fallback={null}>
                {/* {initialData.shouldShowWelcomeModal && <DynamicWelcomeModal user={user} />} */}
                {!initialData.shouldShowWelcomeModal &&
                    !initialData.shouldDisplayNoSourcesModal &&
                    !initialData.shouldDisplaySourcesIncompleteModal && <DynamicApiKeyModal user={user} />}
                {initialData.shouldDisplayNoSourcesModal && <DynamicNoSourcesModal />}
                {initialData.shouldDisplaySourcesIncompleteModal && (
                    <DynamicNoCompleteSourcesModal ccPairs={initialData.ccPairs} />
                )}
                <DynamicChatPopup />
            </Suspense>

        </>
    );
}