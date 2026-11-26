"use client";
import { Button } from "../components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="empty-state panel"><h1>Bu sayfa yüklenemedi.</h1><p>Yeniden deneyebilirsin. Takip listen tarayıcında saklanıyor.</p><Button onClick={reset}>Yeniden dene</Button></div>; }
