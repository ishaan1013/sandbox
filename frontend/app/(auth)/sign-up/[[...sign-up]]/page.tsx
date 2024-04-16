import { SignUp } from "@clerk/nextjs"
import { dark } from "@clerk/themes"

export default function Page() {
  return (
    <SignUp
      appearance={{
        baseTheme: dark,
        elements: {
          footerActionLink: {
            color: "#A3A3A3",
          },
        },
      }}
    />
  )
}
