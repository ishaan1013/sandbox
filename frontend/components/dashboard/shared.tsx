import { Sandbox } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Image from "next/image"
import Button from "../ui/customButton"
import { ChevronRight } from "lucide-react"
import Avatar from "../ui/avatar"

export default function DashboardSharedWithMe({
  shared,
}: {
  shared: {
    id: string
    name: string
    type: "react" | "node"
    author: string
    sharedOn: Date
  }[]
}) {
  return (
    <div className="grow p-4 flex flex-col">
      <div className="text-xl font-medium mb-8">Shared With Me</div>
      <div className="grow w-full">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-background">
              <TableHead>Sandbox Name</TableHead>
              <TableHead>Shared By</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shared.map((sandbox) => (
              <TableRow>
                <TableCell>
                  <div className="font-medium flex items-center">
                    <Image
                      alt=""
                      src={
                        sandbox.type === "react"
                          ? "/project-icons/react.svg"
                          : "/project-icons/node.svg"
                      }
                      width={20}
                      height={20}
                      className="mr-2"
                    />
                    {sandbox.name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Avatar name={sandbox.author} className="mr-2" />
                    {sandbox.author}
                  </div>
                </TableCell>
                <TableCell>{sandbox.sharedOn.toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button>
                    Open <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
