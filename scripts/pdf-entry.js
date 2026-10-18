import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
// No API call. The PDF is generated entirely on the user's device.
export async function createResumePDF(text,fontBytes){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const font=await doc.embedFont(fontBytes,{subset:true});
 const allowed=new Set(font.getCharacterSet());
 const input=String(text||'').normalize('NFC').replace(/\t/g,'    ');
 const unsupported=[...new Set([...input].filter(c=>c!=='\n'&&c!=='\r'&&!allowed.has(c.codePointAt(0))))];
 if(unsupported.length)throw Error('В тексте есть неподдерживаемые символы: '+unsupported.slice(0,8).join(' ')+' — замени их перед PDF.');
 const width=595.28,height=841.89,margin=46,lineHeight=14;
 let page=doc.addPage([width,height]),y=height-margin,first=true;
 const addLine=(line,size)=>{if(y<margin+22){page=doc.addPage([width,height]);y=height-margin}page.drawText(line,{x:margin,y:y-size,font,size,color:rgb(.12,.17,.2)});y-=size===20?28:lineHeight};
 for(const raw of input.split(/\r?\n/)){
  if(!raw.trim()){y-=7;continue}
  const heading=/^(RELEVANT SKILLS|PROJECTS|EDUCATION|EXPERIENCE|ADDITIONAL SKILLS|SKILLS|LANGUAGES)$/.test(raw);
  const size=first&&!/^Dear /i.test(raw)?20:heading?11:10;first=false;
  if(heading&&y<margin+60){page=doc.addPage([width,height]);y=height-margin}
  if(heading)y-=5;
  let line='';
  for(const word of raw.split(/\s+/)){
   const proposed=line?line+' '+word:word;
   if(font.widthOfTextAtSize(proposed,size)<=width-2*margin){line=proposed;continue}
   if(line){addLine(line,size);line=''}
   for(const ch of word){if(line&&font.widthOfTextAtSize(line+ch,size)>width-2*margin){addLine(line,size);line=''}line+=ch}
  }
  if(line)addLine(line,size);
 }
 const pages=doc.getPages();pages.forEach((p,i)=>p.drawText(`${i+1} / ${pages.length}`,{x:width-margin-35,y:25,font,size:8,color:rgb(.45,.48,.5)}));
 doc.setTitle(input.split('\n')[0]||'Application');doc.setCreator('First Offer');
 return doc.save();
}
