import { buildLab, generatePortfolio, type Draw } from "../../../lib/mega-lab";

export const dynamic = "force-dynamic";
const URL = "https://data.ny.gov/resource/5xaw-6ayf.json?$limit=5000&$order=draw_date%20DESC";
async function official(): Promise<Draw[]> {
  const response = await fetch(URL, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error("Official drawing history is temporarily unavailable");
  const rows = await response.json() as Array<{ draw_date:string; winning_numbers:string; mega_ball:string }>;
  return rows.map(row=>({drawDate:row.draw_date.slice(0,10),white:row.winning_numbers.split(" ").map(Number),mega:Number(row.mega_ball)}));
}
export async function GET() {
  try { return Response.json(buildLab(await official())); }
  catch(error) { return Response.json({error:error instanceof Error?error.message:"Unable to load the prediction lab"},{status:503}); }
}
export async function POST(request:Request) {
  try {
    const body=await request.json() as {strategy?:string;lines?:number};
    return Response.json({strategy:body.strategy||"Balanced",lines:generatePortfolio(await official(),body.strategy||"Balanced",Number(body.lines)||5)});
  } catch(error) { return Response.json({error:error instanceof Error?error.message:"Unable to generate a portfolio"},{status:503}); }
}
