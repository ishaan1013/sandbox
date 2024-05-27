"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Link, Loader2, UserPlus, X } from "lucide-react"
import { useState } from "react"
import { Sandbox } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { shareSandbox } from "@/lib/actions"
import { toast } from "sonner"
import SharedUser from "./sharedUser"
import { DialogDescription } from "@radix-ui/react-dialog"

const formSchema = z.object({
  email: z.string().email(),
})

export default function ShareSandboxModal({
  open,
  setOpen,
  data,
  shared,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  data: Sandbox
  shared: {
    id: string
    name: string
  }[]
}) {
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    const res = await shareSandbox(data.id, values.email)
    if (!res.success) {
      toast.error(res.message)
    } else {
      toast.success("Shared successfully.")
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0">
        <div className={`p-6 ${shared.length > 0 ? "pb-3" : null} space-y-6`}>
          <DialogHeader>
            <DialogTitle>Share Sandbox</DialogTitle>
            {data.visibility === "private" ? (
              <DialogDescription className="text-sm text-muted-foreground">
                This sandbox is private. Making it public will allow shared
                users to view and collaborate. You can still share & manage
                access below.
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="flex space-x-4 w-full">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex w-full"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="mr-4 w-full">
                      <FormControl>
                        <Input
                          placeholder="yourfriend@domain.com"
                          {...field}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button disabled={loading} type="submit" className="">
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />{" "}
                      Loading...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" /> Share
                    </>
                  )}
                </Button>
              </form>
            </Form>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${process.env.NEXT_PUBLIC_APP_URL}/code/${data.id}`
                )
                toast.success("Link copied to clipboard.")
              }}
              size="icon"
              disabled={loading}
              variant="outline"
              className="shrink-0"
            >
              <Link className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {shared.length > 0 ? (
          <>
            <div className="w-full h-[1px] mb- bg-border" />
            <div className="p-6 pt-3">
              <DialogHeader className="mb-6">
                <DialogTitle>Manage Access</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {shared.map((user) => (
                  <SharedUser key={user.id} user={user} sandboxId={data.id} />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
