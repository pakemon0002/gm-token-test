'use strict';
window.VoltBalance={
 render(s,fmt,value,btn,icon){
 return '<div class="balance-page"><section class="balance-hero"><small>ИГРОВОЙ БАЛАНС</small><strong>'+value('balance',fmt(s.balance))+'</strong><b>GRAM</b><p>Виртуальные единицы без денежной стоимости</p></section><div class="balance-split"><div class="panel"><small>В ферме</small><b>'+value('pending',fmt(s.pending))+'</b></div><div class="panel"><small>Всего добыто</small><b>'+value('total',fmt(s.total))+'</b></div></div>'+btn('claim','Собрать игровые GRAM','coins','primary',!s.pending)+'<section class="panel balance-info"><h2>Статус операций</h2><div class="balance-row">'+icon('check')+'<div><b>Сбор игровых начислений</b><small>Доступен</small></div></div><div class="balance-row">'+icon('lock')+'<div><b>Реальные переводы недоступны</b><small>Только игровой режим</small></div></div></section>'+btn('go:history','История игры','history')+'</div>';
 }
};