import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"MegaStats Forecast Lab",description:"Five Mega Millions statistical forecasts, verified and scored after every drawing.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
