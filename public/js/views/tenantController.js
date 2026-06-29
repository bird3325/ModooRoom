function authenticateTenantDetailed(event) {
            event.preventDefault();
            markUserVerified();
            showModalAlert('임대인에게 인증 코드를 발송했습니다. 승인 시 최종 인증이 완료됩니다.');
            showView('tenant-app');
        }

function handleWriteStory() {
            if (!isAuthenticated) {
                showModalAlert('2차 인증(임대인/임차인) 완료 후 방 등록이 가능합니다.');
                return;
            }
            showModalAlert('방 등록 기능은 준비 중입니다.');
        }

function handleCommentSubmit() {
            if (!isAuthenticated) {
                showModalAlert('2차 인증(임대인/임차인) 완료 후 댓글 작성이 가능합니다.');
                return;
            }
            showModalAlert('댓글이 성공적으로 등록되었습니다!');
        }

function handleSendInviteToOwner(e) {
            e.preventDefault();
            const ownerName = document.getElementById('invite-owner-name').value;
            const ownerPhone = document.getElementById('invite-owner-phone').value;
            const room = document.getElementById('invite-room').value;
            const tenantName = document.getElementById('tenant-display-name').innerText;

            fetch('/api/invite-owner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerName, ownerPhone, room, tenantName })
            })
            .then(res => res.json())
            .then(res => {
                showModalAlert('임대인 ' + ownerName + '님에게 매칭 및 가입 유도 알림톡 초대가 성공적으로 발송되었습니다!');
                document.getElementById('invite-owner-name').value = '';
                document.getElementById('invite-owner-phone').value = '';
                document.getElementById('invite-room').value = '';
            });
        }

async function loadActiveTenants() {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                try {
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if (session) {
                        const { data, error } = await supabaseClient
                            .from('contracts')
                            .select('*')
                            .eq('owner_id', session.user.id)
                            .in('status', ['matched', 'manual']);
                        
                        if (!error && data) {
                            // Map Supabase fields to frontend fields
                            activeTenantsData = data.map(d => ({
                                id: d.id,
                                tenantName: d.tenant_name || '이름 없음',
                                room: d.room_number,
                                address: d.address,
                                isManual: d.status === 'manual',
                                roomStatus: d.room_status || '공실',
                                tenantPhone: d.tenant_phone || ''
                            }));
                        }
                    }
                } catch(e) { console.error(e); }
            } else {
                // Fallback to mock API if no Supabase
                try {
                    const res = await fetch('/api/matched-tenants');
                    const data = await res.json();
                    activeTenantsData = data;
                } catch(e) { console.error(e); }
            }

            const data = (activeTenantsData || []).filter(function(d) { return d.roomStatus === '입주중'; });
            const section = document.getElementById('active-tenants-section');
            if (data.length === 0) {
                section.innerHTML = '';
                return;
            }
            section.innerHTML = '<div class="card" style="border-top: 4px solid #3182ce;">' +
                '<div class="card-title" style="margin-bottom: 15px;"><i class="fa-solid fa-users"></i> 현재 관리 중인 임차인</div>' +
                '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">' +
                data.map(function(m) {
                    const phoneInfo = m.tenantPhone ? '<div style="font-size: 12px; color: #718096; margin-top: 4px;">' + m.tenantPhone + '</div>' : '';
                    return '<div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; display: flex; justify-content: space-between; align-items: center;">' +
                        '<div>' +
                        '<div style="font-size: 14px; font-weight: bold; color: var(--primary-deep-navy);"><span style="font-size: 11px; font-weight: bold; background: #bee3f8; color: #2b6cb0; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">' + m.room + '</span>' + m.tenantName + '</div>' +
                        phoneInfo +
                        '</div>' +
                        '<button class="btn" style="padding: 6px 12px; font-size: 12px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="showModalAlert(&quot;채널 연결 준비 중입니다.&quot;)">메시지</button>' +
                    '</div>';
                }).join('') +
                '</div></div>';
            
            // 건물 목록 다시 렌더링하여 배지 업데이트
            renderOwnerBuildings();
        }

function checkPendingInvites() {
            loadActiveTenants();
            fetch('/api/pending-invites')
                .then(res => res.json())
                .then(data => {
                    const section = document.getElementById('pending-invites-section');
                    section.innerHTML = data.map((inv, idx) => `
                        <div class="pending-invite-card">
                            <div>
                                <h4 style="color: var(--point-orange); font-weight:700;"><i class="fa-solid fa-envelope-open-text"></i> 임차인 연계 요청이 있습니다.</h4>
                                <p style="font-size:13px; margin-top:4px;"><b>세입자:</b> ${inv.tenantName} | <b>요청 호실:</b> ${inv.room}</p>
                            </div>
                            <button class="btn btn-orange" onclick="acceptInvite(${idx})">매칭 승인</button>
                        </div>
                    `).join('');
                });
        }

function acceptInvite(idx) {
            fetch('/api/accept-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: idx })
            })
            .then(res => res.json())
            .then(() => {
                showModalAlert('임차인 매칭 승인이 완료되어 계약 공간이 동기화되었습니다!');
                checkPendingInvites();
            });
        }

function checkTenantMatchStatus() {
            const tenantName = document.getElementById('tenant-display-name').innerText.trim();
            fetch('/api/tenant-status?name=' + encodeURIComponent(tenantName))
                .then(res => res.json())
                .then(data => {
                    const unmatchedView = document.getElementById('tenant-unmatched-view');
                    const matchedView = document.getElementById('tenant-matched-view');
                    if (data.matched) {
                        unmatchedView.classList.add('hidden');
                        matchedView.classList.remove('hidden');
                        document.getElementById('matched-owner-name').innerText = data.info.ownerName;
                        document.getElementById('matched-owner-phone').innerText = data.info.ownerPhone;
                        document.getElementById('matched-room').innerText = data.info.room;
                    } else {
                        unmatchedView.classList.remove('hidden');
                        matchedView.classList.add('hidden');
                    }
                });
        }

function handleComplaintSubmit(e) {
            e.preventDefault();
            showModalAlert('민원이 성공적으로 접수되었습니다. 임대인에게 알림이 발송됩니다.');
            document.getElementById('complaint-title').value = '';
            document.getElementById('complaint-desc').value = '';
        }

function execDaumPostcodeForTenant() {
            new daum.Postcode({
                oncomplete: function(data) {
                    document.getElementById('tenant-search-address').value = data.address;
                    document.getElementById('tenant-registered-section').classList.add('hidden');
                    document.getElementById('tenant-unregistered-section').classList.add('hidden');
                }
            }).open();
        }

function searchBuildingForTenant() {
            const address = document.getElementById('tenant-search-address').value;
            const room = document.getElementById('tenant-search-room').value;
            if (!address) {
                showModalAlert('주소를 먼저 검색해주세요.');
                return;
            }
            if (!room) {
                showModalAlert('호실을 입력해주세요.');
                return;
            }

            fetch('/api/search-building?address=' + encodeURIComponent(address))
                .then(res => res.json())
                .then(data => {
                    if (data.isRegistered) {
                        currentFoundOwnerName = '대표'; // 실제로는 data.building의 소유자명을 사용해야 하지만 데모용이므로 하드코딩
                        document.getElementById('tenant-found-owner-name').innerText = currentFoundOwnerName;
                        document.getElementById('tenant-registered-section').classList.remove('hidden');
                        document.getElementById('tenant-unregistered-section').classList.add('hidden');
                    } else {
                        document.getElementById('tenant-registered-section').classList.add('hidden');
                        document.getElementById('tenant-unregistered-section').classList.remove('hidden');
                    }
                });
        }

function requestAuthToOwner() {
            const address = document.getElementById('tenant-search-address').value;
            const room = document.getElementById('tenant-search-room').value;
            const tenantName = document.getElementById('common-edit-name').value || '임차인';

            fetch('/api/invite-owner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantName: tenantName,
                    address: address,
                    room: room,
                    ownerName: currentFoundOwnerName
                })
            }).then(() => {
                markUserVerified();
                showModalAlert('임대인에게 성공적으로 인증 요청을 발송했습니다!\
임대인이 승인하면 대시보드에서 계약 정보가 연동됩니다.');
                showView('tenant-app');
            });
        }

function sendInviteToOwner() {
            const phone = document.getElementById('tenant-invite-phone').value;
            if (!phone) {
                showModalAlert('임대인 전화번호를 입력해주세요.');
                return;
            }
            markUserVerified();
            showModalAlert(phone + ' 번호로 모두의 방 가입 초대 문자가 발송되었습니다!\
임대인이 가입하시면 추후 자동으로 연동 신청이 가능합니다.');
            showView('tenant-app');
        }