/** Transport deadline with explicit cleanup; works without AbortSignal.any. */
export function searchRequestDeadline(parent:AbortSignal, timeoutMs:number) {
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0) throw new Error("A positive request deadline is required");
  const controller=new AbortController();
  const cancel=()=>controller.abort(parent.reason);
  if(parent.aborted) cancel();else parent.addEventListener("abort",cancel,{once:true});
  const timer=setTimeout(()=>controller.abort("search_timeout"),timeoutMs);
  return {signal:controller.signal,dispose:()=>{clearTimeout(timer);parent.removeEventListener("abort",cancel);}};
}
