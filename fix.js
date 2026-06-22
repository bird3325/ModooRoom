const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Fix syntax errors introduced by the bad multi_replace backticks
code = code.replace(/let styleStr = `padding: 5px; cursor: pointer; border-radius: 4px; transition: 0\.2s; color: \$\{textColor\};`;/g, 
    'let styleStr = \'padding: 5px; cursor: pointer; border-radius: 4px; transition: 0.2s; color: \' + textColor + \';\';');

code = code.replace(/gridHtml \+= `\n                        <div style="\$\{styleStr\}" \n                             onmouseover="if\(!\$\{isSelected\}\) this\.style\.background='#edf2f7'" \n                             onmouseout="if\(!\$\{isSelected\}\) this\.style\.background='transparent'" \n                             onclick="selectCalendarDate\('\$\{dateStr\}'\)">\$\{d\}<\/div>\n                    `;/g, 
    "gridHtml += '<div style=\"' + styleStr + '\" ' +\n" +
    "                             'onmouseover=\"if(!' + isSelected + ') this.style.background=\\'#edf2f7\\'\" ' +\n" +
    "                             'onmouseout=\"if(!' + isSelected + ') this.style.background=\\'transparent\\'\" ' +\n" +
    "                             'onclick=\"selectCalendarDate(\\'' + dateStr + '\\')\">' + d + '</div>';");

// Other backtick interpolations were replaced too?
code = code.replace(/return `\n                <tr style="border-bottom: 1px solid #edf2f7;">\n                    <td style="padding: 12px 8px; font-weight: 500;">\$\{b\.name \|\| '-'}<\/td>\n                    <td style="padding: 12px 8px;">\$\{b\.address \|\| '-'}<\/td>\n                    <td style="padding: 12px 8px; text-align: center;">\$\{new Date\(b\.created_at\)\.toLocaleDateString\(\)}<\/td>\n                    <td style="padding: 12px 8px; text-align: center;">\n                        \$\{b\.is_verified \n                            \? `<span class="badge badge-blue">검증완료 \(\$\{ownerName\}\)<\/span>`\n                            : `<span class="badge badge-orange">미인증 \(\$\{ownerName\}\)<\/span>`\n                        }\n                    <\/td>\n                    <td style="padding: 12px 8px; text-align: center;">\n                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: #ed8936; border: none; color: white; margin-right: 5px;" onclick="toggleBuildingVerify\('\$\{b\.id\}', \$\{b\.is_verified\}\)">\$\{b\.is_verified \? '인증취소' : '인증승인'}<\/button>\n                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: #e53e3e; border: none; color: white;" onclick="deleteAdminBuilding\('\$\{b\.id\}'\)">삭제<\/button>\n                    <\/td>\n                <\/tr>\n            `/g,
`return '<tr style="border-bottom: 1px solid #edf2f7;">' +
'<td style="padding: 12px 8px; font-weight: 500;">' + (b.name || '-') + '</td>' +
'<td style="padding: 12px 8px;">' + (b.address || '-') + '</td>' +
'<td style="padding: 12px 8px; text-align: center;">' + new Date(b.created_at).toLocaleDateString() + '</td>' +
'<td style="padding: 12px 8px; text-align: center;">' +
(b.is_verified ? '<span class="badge badge-blue">검증완료 (' + ownerName + ')</span>' : '<span class="badge badge-orange">미인증 (' + ownerName + ')</span>') +
'</td><td style="padding: 12px 8px; text-align: center;">' +
'<button class="btn" style="padding: 4px 8px; font-size: 11px; background: #ed8936; border: none; color: white; margin-right: 5px;" onclick="toggleBuildingVerify(\\'' + b.id + '\\', ' + b.is_verified + ')">' + (b.is_verified ? '인증취소' : '인증승인') + '</button>' +
'<button class="btn" style="padding: 4px 8px; font-size: 11px; background: #e53e3e; border: none; color: white;" onclick="deleteAdminBuilding(\\'' + b.id + '\\')">삭제</button></td></tr>';`
);

code = code.replace(/let headerHtml = `\n                <div style="cursor:pointer; padding:2px 5px; border-radius:4px; font-weight:bold; color:var\(--primary-deep-navy\); font-size:15px;" onmouseover="this\.style\.background='#edf2f7'" onmouseout="this\.style\.background='transparent'" onclick="switchCalendarMode\('decade'\)">\$\{year\}년<\/div>\n                <div style="cursor:pointer; padding:2px 5px; border-radius:4px; font-weight:bold; color:var\(--primary-deep-navy\); font-size:15px;" onmouseover="this\.style\.background='#edf2f7'" onmouseout="this\.style\.background='transparent'" onclick="switchCalendarMode\('month'\)">\$\{month \+ 1\}월<\/div>\n            `;/g,
`let headerHtml = '<div style="cursor:pointer; padding:2px 5px; border-radius:4px; font-weight:bold; color:var(--primary-deep-navy); font-size:15px;" onmouseover="this.style.background=\\'#edf2f7\\'" onmouseout="this.style.background=\\'transparent\\'" onclick="switchCalendarMode(\\'decade\\')">' + year + '년</div>' +
'<div style="cursor:pointer; padding:2px 5px; border-radius:4px; font-weight:bold; color:var(--primary-deep-navy); font-size:15px;" onmouseover="this.style.background=\\'#edf2f7\\'" onmouseout="this.style.background=\\'transparent\\'" onclick="switchCalendarMode(\\'month\\')">' + (month + 1) + '월</div>';`
);

code = code.replace(/return `\n                    <tr style="border-bottom: 1px solid #e2e8f0;">\n                        <td style="padding: 12px 8px;">\$\{u\.name\}<\/td>\n                        <td style="padding: 12px 8px;">\$\{u\.email\}<\/td>\n                        <td style="padding: 12px 8px;">\$\{u\.phone \|\| '-'}<\/td>\n                        <td style="padding: 12px 8px;">\$\{roleBadge\}<\/td>\n                        <td style="padding: 12px 8px; text-align: center;">\$\{dateStr\}<\/td>\n                        <td style="padding: 12px 8px; text-align: center;">\n                            <button class="\$\{verifyBtnClass\}" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;" onclick="toggleVerification\('\$\{u\.id\}', \$\{u\.is_verified\}\)">\$\{verifyBtnText\}<\/button>\n                            <button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="openAdminEditModal\('\$\{u\.id\}', '\$\{u\.name\}', '\$\{u\.phone \|\| ''\}'\)">수정<\/button>\n                            <button class="btn" style="padding: 4px 8px; font-size: 11px; background: none; border: none; color: #e53e3e; cursor: pointer; font-weight: bold;" onclick="deleteAdminUser\('\$\{u\.id\}'\)">삭제<\/button>\n                        <\/td>\n                    <\/tr>\n                `;/g,
`return '<tr style="border-bottom: 1px solid #e2e8f0;">' +
'<td style="padding: 12px 8px;">' + u.name + '</td>' +
'<td style="padding: 12px 8px;">' + u.email + '</td>' +
'<td style="padding: 12px 8px;">' + (u.phone || '-') + '</td>' +
'<td style="padding: 12px 8px;">' + roleBadge + '</td>' +
'<td style="padding: 12px 8px; text-align: center;">' + dateStr + '</td>' +
'<td style="padding: 12px 8px; text-align: center;">' +
'<button class="' + verifyBtnClass + '" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;" onclick="toggleVerification(\\'' + u.id + '\\', ' + u.is_verified + ')">' + verifyBtnText + '</button>' +
'<button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="openAdminEditModal(\\'' + u.id + '\\', \\'' + u.name + '\\', \\'' + (u.phone || '') + '\\')">수정</button>' +
'<button class="btn" style="padding: 4px 8px; font-size: 11px; background: none; border: none; color: #e53e3e; cursor: pointer; font-weight: bold;" onclick="deleteAdminUser(\\'' + u.id + '\\')">삭제</button></td></tr>';`
);

code = code.replace(/return `\n                                        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #edf2f7; text-align: left; margin-bottom: 10px;">\n                                            <p style="font-size: 13px; color: #4a5568; margin: 0 0 5px 0;"><strong>등록 건물명:<\/strong> \$\{b\.name \|\| '-'} \$\{verifiedBadge\}<\/p>\n                                            <p style="font-size: 13px; color: #4a5568; margin: 0;"><strong>등록 주소:<\/strong> \$\{b\.address \|\| '-'}<\/p>\n                                        <\/div>\n                                        `;/g,
`return '<div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #edf2f7; text-align: left; margin-bottom: 10px;">' +
'<p style="font-size: 13px; color: #4a5568; margin: 0 0 5px 0;"><strong>등록 건물명:</strong> ' + (b.name || '-') + ' ' + verifiedBadge + '</p>' +
'<p style="font-size: 13px; color: #4a5568; margin: 0;"><strong>등록 주소:</strong> ' + (b.address || '-') + '</p></div>';`
);

code = code.replace(/section\.innerHTML = data\.map\(\(inv, idx\) => `\n                        <div class="pending-invite-card">\n                            <div>\n                                <h4 style="color: var\(--point-orange\); font-weight:700;"><i class="fa-solid fa-envelope-open-text"><\/i> 임차인 연계 요청이 있습니다\.<\/h4>\n                                <p style="font-size:13px; margin-top:4px;"><b>세입자:<\/b> \$\{inv\.tenantName\} \| <b>요청 호실:<\/b> \$\{inv\.room\}<\/p>\n                            <\/div>\n                            <button class="btn btn-orange" onclick="acceptInvite\(\$\{idx\}\)">매칭 승인<\/button>\n                        <\/div>\n                    `\)\.join\(''\);/g,
`section.innerHTML = data.map((inv, idx) => 
'<div class="pending-invite-card"><div>' +
'<h4 style="color: var(--point-orange); font-weight:700;"><i class="fa-solid fa-envelope-open-text"></i> 임차인 연계 요청이 있습니다.</h4>' +
'<p style="font-size:13px; margin-top:4px;"><b>세입자:</b> ' + inv.tenantName + ' | <b>요청 호실:</b> ' + inv.room + '</p>' +
'</div><button class="btn btn-orange" onclick="acceptInvite(' + idx + ')">매칭 승인</button></div>'
).join('');`
);

code = code.replace(/container\.innerHTML = `\n                        <div style="background-color: #f0f4f8; padding: 15px; border-radius: 8px; border-left: 4px solid var\(--primary-light-blue\); font-size:13px;">\n                            <b>소재지:<\/b> \$\{res\.data\.property\.address\} \$\{res\.data\.property\.room_number\}<br>\n                            <b>임차인:<\/b> \$\{res\.data\.tenant\.name\}님\n                        <\/div>\n                    `;/g,
`container.innerHTML = '<div style="background-color: #f0f4f8; padding: 15px; border-radius: 8px; border-left: 4px solid var(--primary-light-blue); font-size:13px;">' +
'<b>소재지:</b> ' + res.data.property.address + ' ' + res.data.property.room_number + '<br>' +
'<b>임차인:</b> ' + res.data.tenant.name + '님</div>';`
);

code = code.replace(/list\.innerHTML = data\.map\(item => `\n                        <div class="inventory-item">\n                            <div>\n                                <h4>\$\{item\.name\}<\/h4>\n                                <span style="font-size:12px; color:#718096;">재고: \$\{item\.stock\}개<\/span>\n                            <\/div>\n                            <span class="badge \$\{item\.is_low_stock \? 'badge-orange' : 'badge-blue'\}">\$\{item\.badge_text\}<\/span>\n                        <\/div>\n                    `\)\.join\(''\);/g,
`list.innerHTML = data.map(item => '<div class="inventory-item"><div><h4>' + item.name + '</h4>' +
'<span style="font-size:12px; color:#718096;">재고: ' + item.stock + '개</span></div>' +
'<span class="badge ' + (item.is_low_stock ? 'badge-orange' : 'badge-blue') + '">' + item.badge_text + '</span></div>'
).join('');`
);

fs.writeFileSync('server.js', code);
