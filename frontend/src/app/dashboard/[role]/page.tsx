import { LiveWorkspace } from '@/components/live-workspace';
import { notFound } from 'next/navigation';
export function generateStaticParams(){return ['client','designer','operator'].map(role=>({role}))}
export default async function Page({params}:{params:Promise<{role:string}>}){const {role}=await params;if(!['client','designer','operator'].includes(role))notFound();return <LiveWorkspace key={role} requestedRole={role}/>}

