"use client"

import * as React from "react"
import { ChevronDown, Cpu, Folder, Mic, MicOff, Network, Plus, Search, Server, Settings } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Sample data for campaigns
const campaigns = [
  { id: "1", name: "Sirione", icon: Folder },
  { id: "2", name: "Barovia", icon: Folder },
  { id: "3", name: "Lost Mines of Phandelver", icon: Folder },
  { id: "4", name: "Test", icon: Folder },
]

const favoriteCampaigns = [
  { id: "1", name: "Sirione", icon: Folder },
  { id: "2", name: "Barovia", icon: Folder },
]

const recentCampaigns = [
  { id: "1", name: "Sirione", icon: Folder },
  { id: "2", name: "Barovia", icon: Folder },
  { id: "4", name: "Test", icon: Folder },
]

// Sample data for servers and people
const servers = [
  {
    id: "1",
    name: "General",
    people: [
      { id: "1-1", name: "Alice Johnson", avatar: "/placeholder.svg?height=32&width=32", broadcasting: true },
      { id: "1-2", name: "Bob Smith", avatar: "/placeholder.svg?height=32&width=32", broadcasting: false },
      { id: "1-3", name: "Carol Williams", avatar: "/placeholder.svg?height=32&width=32", broadcasting: true },
    ],
  },
  {
    id: "2",
    name: "Whisper",
    people: [],
  },
  {
    id: "3",
    name: "AFK",
    people: [],
  },
]

export default function NodalGraphDashboard() {
  const [activeCampaign, setActiveCampaign] = React.useState<string | null>(null)
  const [expandedServers, setExpandedServers] = React.useState<string[]>([])

  const toggleServer = (serverId: string) => {
    setExpandedServers((prev) => (prev.includes(serverId) ? prev.filter((id) => id !== serverId) : [...prev, serverId]))
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        {/* Left Sidebar */}
        <Sidebar className="border-r w-64">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-4 py-2">
              <Network className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Nodal Graph</h2>
            </div>
            <div className="px-4 py-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search campaigns..." className="pl-8" />
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Favorite Campaigns</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {favoriteCampaigns.map((campaign) => (
                    <SidebarMenuItem key={campaign.id}>
                      <SidebarMenuButton>
                        <campaign.icon className="h-4 w-4" />
                        <span>{campaign.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Recent</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {recentCampaigns.map((campaign) => (
                    <SidebarMenuItem key={campaign.id}>
                      <SidebarMenuButton>
                        <campaign.icon className="h-4 w-4" />
                        <span>{campaign.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center justify-between">
                <span>Campaigns</span>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <Plus className="h-4 w-4" />
                </Button>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {campaigns.map((campaign) => (
                    <SidebarMenuItem key={campaign.id}>
                      <SidebarMenuButton>
                        <campaign.icon className="h-4 w-4" />
                        <span>{campaign.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>

        {/* Main Content */}
        <div className="flex flex-col flex-grow overflow-hidden">
          <div className="flex h-16 items-center justify-between border-b px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">Nodal Graph Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Cpu className="mr-2 h-4 w-4" />
                New Node
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-grow overflow-hidden relative">
            <div className="absolute inset-0 p-6">
              <div className="rounded-lg border border-dashed p-8 text-center h-full flex flex-col justify-center">
                <Network className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Nodal Graph Visualization</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Select categories from the left sidebar and view server details in the right sidebar.
                </p>
              </div>
            </div>
          </div>
          {/* Bottom bar with tabs */}
          <div className="border-t bg-background absolute bottom-0 left-64 right-64">
            <Tabs defaultValue="characters" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b px-2">
                <TabsTrigger value="characters" className="data-[state=active]:bg-muted">
                  Characters
                </TabsTrigger>
                <TabsTrigger value="locations" className="data-[state=active]:bg-muted">
                  Locations
                </TabsTrigger>
                <TabsTrigger value="lore" className="data-[state=active]:bg-muted">
                  Lore
                </TabsTrigger>
                <TabsTrigger value="story" className="data-[state=active]:bg-muted">
                  Story
                </TabsTrigger>
                <TabsTrigger value="arcs" className="data-[state=active]:bg-muted">
                  Arcs
                </TabsTrigger>
                <TabsTrigger value="items" className="data-[state=active]:bg-muted">
                  Items
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Right Sidebar */}
        <Sidebar side="right" className="border-l w-64">
          <SidebarHeader>
            <div className="flex items-center justify-between px-4 py-2">
              <h2 className="text-lg font-semibold">Servers</h2>
              <Button variant="ghost" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <ScrollArea className="h-[calc(100vh-4rem)]">
              {servers.map((server) => (
                <div key={server.id} className="px-4 py-2">
                  <Collapsible open={expandedServers.includes(server.id)} onOpenChange={() => toggleServer(server.id)}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex w-full items-center justify-between rounded-md p-2 text-left"
                      >
                        <div className="flex items-center">
                          <Server className="mr-2 h-4 w-4" />
                          <span>{server.name}</span>
                        </div>
                        {server.people.length > 0 && (
                          <Badge variant="outline" className="ml-2">
                            {server.people.length}
                          </Badge>
                        )}
                        {server.people.length > 0 && (
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedServers.includes(server.id) ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    {server.people.length > 0 && (
                      <CollapsibleContent>
                        <div className="mt-1 space-y-1 pl-6">
                          {server.people.map((person) => (
                            <div
                              key={person.id}
                              className="flex items-center justify-between rounded-md p-2 hover:bg-muted"
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={person.avatar} alt={person.name} />
                                  <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{person.name}</span>
                              </div>
                              {person.broadcasting ? (
                                <Badge variant="default" className="flex items-center gap-1 bg-green-500">
                                  <Mic className="h-3 w-3" />
                                  <span className="text-xs">Live</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <MicOff className="h-3 w-3" />
                                  <span className="text-xs">Muted</span>
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                  <Separator className="my-2" />
                </div>
              ))}
            </ScrollArea>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
      </div>
    </SidebarProvider>
  )
}

