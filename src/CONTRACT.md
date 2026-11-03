Shared contract. Store exports useStore(): Snapshot & methods:
ready:boolean; error:string|null; refresh():Promise<void>;
saveBook(input:BookInput,id?:number):Promise<number>;
deleteBook(id:number):Promise<void>;
updateProgress(bookId:number,page:number):Promise<void>;
saveSession(input:{bookId:number;startPage:number;endPage:number;durationSeconds:number;startedAt:string;source:'manual'|'timer'|'progress'}, finishTimer?:boolean):Promise<void>;
saveNote(input:NoteInput,id?:number):Promise<void>;
deleteNote(id:number):Promise<void>;
setSettings(patch:Partial<Settings>):Promise<void>;
setYearGoal(goal:number):Promise<void>;
startTimer(bookId:number):Promise<void>;pauseTimer():Promise<void>;resumeTimer():Promise<void>;discardTimer():Promise<void>;
clearAll():Promise<void>;
StoreProvider wraps App. Persist mutations first, then refresh. All errors reject for UI handling.
UI exports from src/ui.tsx: useTheme() => {colors,dark}; colors keys bg,surface,text,muted,border,accent,onAccent,soft,danger,gold.
Screen({children,scroll?:boolean}) safe-area padding (default scroll true); Heading({title,subtitle?,action?}); Section({title,action?,children}); Button({title,onPress,variant?:'primary'|'secondary'|'danger',disabled?,icon?}); Field({label,...TextInputProps}); Card({children,style?}); Empty({title,description?,action?}); Cover({book:Partial<Book>,width?:number,height?:number}); Progress({value:number}); Chip({label,selected?,onPress}); Metric({label,value}); useTheme plus helpers showError(error), confirm(title,message,onConfirm).
Screens use native-stack any navigation props for simplicity. Routes in types.ts. Root owns theme provider and ui.tsx. Dates ISO strings; dayKey helper in analytics.ts uses LOCAL date.
