// Functional smoke test of the shared React Native UI and real SQLite WASM.
// Native installation/device checks are separate; this is not an Android emulator.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:393,height:851}});
// Expo54 SQLite's short Atomics.pause spin limit can expire in Chromium during native compilation.
// Use its existing longer fallback spin loop in this QA runtime only.
await context.addInitScript(()=>{Object.defineProperty(Atomics,'pause',{value:undefined,configurable:true});});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('artifacts/qa',{recursive:true});
async function click(name){await page.getByRole('button',{name,exact:true}).click();}
async function field(label,value){const input=page.locator('input,textarea').filter({visible:true});const index=await page.locator('input,textarea').evaluateAll((nodes,label)=>nodes.findIndex(n=>n.parentElement.textContent.includes(label)),label);if(index<0)throw new Error('No field '+label);await page.locator('input,textarea').nth(index).fill(value);}
async function boot(){await page.goto('http://localhost:8081');for(let i=0;i<4;i++){await page.waitForTimeout(1800);if(await page.getByText('Повторить',{exact:true}).isVisible()){await page.getByText('Повторить',{exact:true}).click();}else break;}await page.getByText('На вашей закладке',{exact:true}).waitFor();}
try{
 await boot();await page.screenshot({path:'artifacts/qa/01-home.png'});
 await click('Добавить первую книгу');await page.getByPlaceholder('Название книги').fill('QA · Тихие страницы');await page.getByPlaceholder('Имя автора').fill('Локальный автор');await field('Всего страниц','240');await click('Сейчас читаю');await click('Сохранить книгу');await page.getByText('На книжной полке',{exact:true}).waitFor();
 await field('Текущая страница','20');await click('Сохранить');await page.getByText('Страница 20 из 240',{exact:true}).waitFor();
 await click('Запись');await page.getByPlaceholder('Сохраните то, что откликнулось…').fill('Чтение сохраняет тишину.');await click('Сохранить запись');await page.getByText('Чтение сохраняет тишину.',{exact:true}).filter({visible:true}).waitFor();
 await click('Начать чтение');await page.getByRole('timer').waitFor();await page.waitForTimeout(2100);await click('Пауза');const paused=await page.getByRole('timer').innerText();await page.reload();await page.waitForTimeout(1800);if(await page.getByText('Повторить',{exact:true}).isVisible())await page.getByText('Повторить',{exact:true}).click();await page.getByText(/Сессия чтения на паузе/).click();if(await page.getByRole('timer').innerText()!==paused)throw new Error('Paused timer changed after restart');await click('Продолжить чтение');await page.waitForTimeout(1100);await click('Завершить и сохранить');await field('Текущая страница','30');await click('Сохранить сессию');await page.getByText('Страница 30 из 240',{exact:true}).filter({visible:true}).waitFor();await page.screenshot({path:'artifacts/qa/02-book.png'});
 // Full process/page restart retains book, sessions, notes and progress.
 await boot();await page.getByText('QA · Тихие страницы',{exact:true}).first().waitFor();
 await context.setOffline(true);
 for(const label of ['Библиотека','Дневник','Аналитика','Настройки']){await page.getByRole('tab',{name:new RegExp(label)}).click();await page.waitForTimeout(150);}
 await click('Тёмная');await page.screenshot({path:'artifacts/qa/03-dark.png'});await click('Светлая');
 await page.getByRole('tab',{name:/Дневник/}).click();await page.getByRole('button',{name:'Редактировать запись',exact:true}).click();await page.getByPlaceholder('Сохраните то, что откликнулось…').fill('Отредактированная мысль.');await click('Сохранить запись');await page.getByText('«Отредактированная мысль.»',{exact:true}).waitFor();
 await page.getByRole('tab',{name:/Главная/}).click();await page.getByText('Календарь →',{exact:true}).first().click();await page.getByText('Календарь чтения',{exact:true}).first().waitFor();await page.screenshot({path:'artifacts/qa/04-calendar.png'});
 await click('Тепловая карта');await click('Предыдущий месяц');await click('Следующий месяц');console.log('PASS: add book, progress, note, timer pause/resume/restart/save, persistence, tabs, themes, calendar.');if(errors.length)throw new Error(errors.join('\n'));console.log('No uncaught UI exceptions.');
}catch(error){console.error((await page.locator('body').innerText()).slice(-5000));await page.screenshot({path:'artifacts/qa/failure.png'});throw error;}finally{await browser.close();}
