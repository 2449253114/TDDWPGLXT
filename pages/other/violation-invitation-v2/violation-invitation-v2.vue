<template>
	<view class="page-container">
		<uni-card :is-shadow="false" :is-full="false" :border="true" margin="0 0 12px 0">
			<view class="page-heading">
				<view>
					<text class="page-title">违规邀请检测与处置工作台</text>
					<text class="page-subtitle">按范围主动扫描可疑邀请人，再下钻处理其名下同 IP 或指定受邀账号</text>
				</view>
				<view class="thresholds">
					<text class="threshold-label">同 IP 风险阈值</text>
					<text class="risk-pill normal">正常 1–5</text>
					<text class="risk-pill medium">中风险 6–14</text>
					<text class="risk-pill high">高风险 ≥15</text>
				</view>
			</view>

			<view v-if="taskStatus.visible" class="task-panel" :class="{ error: taskStatus.error }">
				<view class="task-row">
					<text class="task-message">{{ taskStatus.message }}</text>
					<text v-if="taskStatus.metricText" class="task-metric">{{ taskStatus.metricText }}</text>
				</view>
				<view v-if="taskStatus.determinate" class="progress-track">
					<view class="progress-value" :style="{ width: taskStatus.progress + '%' }"></view>
				</view>
			</view>
		</uni-card>

		<uni-card :is-shadow="false" :is-full="false" :border="true" margin="0 0 12px 0">
			<view class="section-heading">
				<view>
					<text class="section-title">选择检测范围</text>
					<text class="section-subtitle">默认检测全部邀请关系，不需要运营人员预先知道邀请码</text>
				</view>
			</view>
			<view class="scope-tabs">
				<button size="mini" :class="{ active: scanScope === 'all' }" :disabled="busy" @click="setScanScope('all')">全部</button>
				<button size="mini" :class="{ active: scanScope === 'time' }" :disabled="busy" @click="setScanScope('time')">邀请时间范围</button>
				<button size="mini" :class="{ active: scanScope === 'code' }" :disabled="busy" @click="setScanScope('code')">指定邀请码</button>
			</view>

			<view v-if="scanScope === 'time'" class="scope-condition">
				<view class="date-mode-heading">
					<text class="filter-label">按天快捷选择</text>
					<text class="business-today">今天：{{ businessToday }}</text>
				</view>
				<view class="date-mode-options">
					<button
						v-for="option in scanDateOptions"
						:key="'scan-date-' + option.value"
						size="mini"
						:class="{ active: scanDateMode === option.value }"
						:disabled="busy"
						@click="setScanDateMode(option.value)"
					>
						{{ option.label }}
					</button>
				</view>
				<view v-if="scanDateMode === 'custom'" class="custom-days-row">
					<uni-easyinput
						v-model="customScanDays"
						type="number"
						:disabled="busy"
						placeholder="请输入天数"
						@confirm="startRiskScan"
					/>
					<text>天内（含今天）</text>
				</view>
				<view v-if="scanDateMode === 'manual'" class="manual-date-row">
					<uni-datetime-picker
						v-model="scanDateRange"
						type="daterange"
						range-separator="至"
						:end="businessToday"
						:disabled="busy"
						@change="onManualScanDateChanged"
					/>
					<text class="date-help">只需选择年月日；结束日期是今天时截止确认时刻，否则自动截止到当天 23:59:59。</text>
				</view>
				<text class="inline-note">所有快捷范围均按自然日计算；邀请时间按数据库 timestamp 的毫秒值处理。</text>
			</view>
			<view v-else-if="scanScope === 'code'" class="scope-condition query-row">
				<uni-easyinput
					v-model="inviteCodeInput"
					:maxlength="6"
					:disabled="busy"
					placeholder="仅在需要精确复查某个邀请人时填写"
					@confirm="startRiskScan"
				/>
			</view>
			<view v-else class="scope-condition scope-all-tip">
				将分页读取全部有效邀请关系，按邀请人独立分析，不会一次性把全部明细渲染到页面。
			</view>

			<view class="scan-actions">
				<button size="mini" type="default" :disabled="busy" @click="confirmClearDiscoveryBaseline">清除本地检测基线</button>
				<button
					v-if="isRiskScanning"
					size="mini"
					type="warn"
					:disabled="isCommittingScan"
					@click="cancelRiskScan"
				>
					{{ isCommittingScan ? '正在提交结果' : '取消检测' }}
				</button>
				<button size="mini" type="primary" :loading="isRiskScanning" :disabled="busy" @click="startRiskScan">
					{{ isRiskScanning ? '正在检测' : (scanCompletedAt ? '重新检测' : '开始检测') }}
				</button>
			</view>
			<view class="inline-note">关系数据按固定边界自动分片，每页 1000 条、最多 6 路并行；首遍显示已读取数量，复核阶段显示真实 X/Y。确认时刻及之后的新绑定与确认后的新登录留到下一次检测，不会混入当前结果。</view>
			<view class="inline-note baseline-note">新增与待审核基线仅保存在当前浏览器本地数据库，不会在不同电脑之间同步。</view>
			<view v-if="baselineWarning" class="load-warning baseline-warning">{{ baselineWarning }}</view>
		</uni-card>

		<uni-card v-if="scanCompletedAt" :is-shadow="false" :is-full="false" :border="true" margin="0 0 12px 0">
			<view class="section-heading">
				<view>
					<text class="section-title">检测结果</text>
					<text class="section-subtitle">
						{{ isCommittingScan ? '结果已汇总于' : '完成于' }} {{ formatTimestamp(scanCompletedAt) }}；{{ scanResultScopeDescription }}
					</text>
					<text class="section-subtitle scan-read-summary">
						首遍读取 {{ scanReadSummary.relationshipCount }} 条关系，识别 {{ scanReadSummary.discoveredInviterCount }} 位邀请人，稳定发布 {{ scanReadSummary.stableInviterCount }} 位，跳过 {{ scanReadSummary.skippedInviterCount }} 位
					</text>
				</view>
			</view>

			<view class="stats-grid discovery-stats">
				<view class="stat-card"><text class="stat-number">{{ scanSummary.inviterCount }}</text><text class="stat-label">邀请人</text></view>
				<view class="stat-card"><text class="stat-number">{{ scanSummary.inviteeCount }} 人</text><text class="stat-label">当前受邀账号</text></view>
				<view class="stat-card high"><text class="stat-number">{{ scanSummary.highCount }}</text><text class="stat-label">高风险</text></view>
				<view class="stat-card abnormal"><text class="stat-number">{{ scanSummary.abnormalCount }}</text><text class="stat-label">异常中</text></view>
				<view class="stat-card medium"><text class="stat-number">{{ scanSummary.mediumCount }}</text><text class="stat-label">中风险</text></view>
				<view class="stat-card pending"><text class="stat-number">{{ scanSummary.pendingCount }}</text><text class="stat-label">待审核</text></view>
			</view>

			<view
				v-if="scanSummary.highIpGroupCount || scanSummary.mediumIpGroupCount"
				:class="['ip-risk-banner', { high: scanSummary.highIpGroupCount }]"
			>
				<view class="ip-risk-banner-copy">
					<text class="ip-risk-banner-title">检测到需要重点核查的同 IP 聚集</text>
					<text class="ip-risk-banner-detail">
						高风险 IP 组 {{ scanSummary.highIpGroupCount }} 个，中风险 IP 组 {{ scanSummary.mediumIpGroupCount }} 个，最高同 IP {{ scanSummary.maxSharedIpCount }} 人
					</text>
				</view>
				<text class="ip-risk-banner-hint">下方每位邀请人均已直接标出风险组数量，无需人工逐条统计。</text>
			</view>
			<view v-if="scanSummary.skippedCount" class="load-warning baseline-warning skipped-warning">
				<text>本轮有 {{ scanSummary.skippedCount }} 位邀请人未能取得稳定结果，已从展示、审核和封禁入口移除；有旧基线的已原样保留，无旧基线的未创建伪基线。</text>
				<view class="skipped-detail-list">
					<text v-for="item in scanSkippedPreview" :key="item.inviterId" class="skipped-detail-item">{{ item.inviterId }}：{{ item.reason }}</text>
					<text v-if="scanSkippedRemainingCount" class="skipped-detail-more">另有 {{ scanSkippedRemainingCount }} 位，请按本次检测完成提示重新检测。</text>
				</view>
			</view>

			<view v-if="scanSummary.hasCurrentChanges" class="discovery-alert">
				<text class="discovery-alert-title">本次检测发现变化</text>
				<text>新增邀请人 {{ scanSummary.newInviterCount }} 个</text>
				<text>新增受邀账号 {{ scanSummary.newInviteeCount }} 个</text>
				<text>新增同 IP 组 {{ scanSummary.newIpGroupCount }} 个</text>
				<text>同 IP 组增长 {{ scanSummary.grownIpGroupCount }} 个</text>
				<text>风险升级 {{ scanSummary.riskUpgradeCount }} 个</text>
			</view>
			<view v-else-if="scanSummary.firstDiscoveryCount" class="discovery-alert first">
				首次建立本地检测基线：共发现 {{ scanSummary.firstDiscoveryCount }} 个邀请人；已封禁邀请人会自动纳入基线，其余首次发现项保留为待审核。
			</view>

			<view class="result-filter-panel">
				<view class="filter-row">
					<text class="filter-label">风险</text>
					<button v-for="option in scanRiskOptions" :key="'scan-risk-' + option.value" size="mini" :class="{ active: scanRiskFilter === option.value }" @click="setScanRiskFilter(option.value)">{{ option.label }}</button>
				</view>
				<view class="filter-row">
					<text class="filter-label">审核</text>
					<button v-for="option in scanReviewOptions" :key="'scan-review-' + option.value" size="mini" :class="{ active: scanReviewFilter === option.value }" @click="setScanReviewFilter(option.value)">{{ option.label }}</button>
				</view>
				<uni-easyinput v-model="scanKeyword" placeholder="搜索邀请人邀请码或用户 ID" @input="onScanFilterChanged" @clear="onScanFilterChanged" />
			</view>

			<view v-if="scanResults.length === 0" class="empty-state table-empty">
				本次扫描已完成，当前范围内没有可发布的稳定邀请人结果；首遍实际读取 {{ scanReadSummary.relationshipCount }} 条关系，跳过 {{ scanReadSummary.skippedInviterCount }} 位。
			</view>
			<view v-else-if="pagedScanResults.length === 0" class="empty-state table-empty filtered-empty-state">
				<text>本次已发布 {{ scanResults.length }} 位邀请人，但被当前筛选条件全部隐藏。</text>
				<button size="mini" type="default" @click="resetScanResultFilters">清除筛选并显示全部</button>
			</view>
			<uni-table v-else border stripe>
				<uni-tr>
					<uni-th width="150" align="center">发现状态</uni-th>
					<uni-th width="90" align="center">风险</uni-th>
					<uni-th width="120" align="center">邀请人邀请码</uni-th>
					<uni-th width="190" align="center">邀请人 ID</uni-th>
					<uni-th width="250" align="center">邀请人注册 / 登录</uni-th>
					<uni-th v-if="scanResultScope === 'time'" width="90" align="center">范围命中</uni-th>
					<uni-th width="105" align="center">总受邀账号</uni-th>
					<uni-th width="180" align="center">同 IP 风险汇总</uni-th>
					<uni-th width="110" align="center">时间异常</uni-th>
					<uni-th width="95" align="center">账号状态</uni-th>
					<uni-th width="230" align="center">风险原因</uni-th>
					<uni-th width="230" align="center">操作</uni-th>
				</uni-tr>
				<uni-tr v-for="item in pagedScanResults" :key="item.inviterId" :class="{ 'new-result-row': item.pendingReview }">
					<uni-td align="center">
						<view class="change-badges">
							<text v-for="badge in getChangeBadges(item)" :key="badge" class="change-badge">{{ badge }}</text>
							<text v-if="item.autoBaselined" class="reviewed-badge auto-baselined">已自动标记已审核</text>
							<text v-else-if="!item.pendingReview" class="reviewed-badge">已审核</text>
						</view>
					</uni-td>
					<uni-td align="center"><text :class="['risk-pill', item.riskLevel]">{{ getRiskText(item.riskLevel) }}</text></uni-td>
					<uni-td align="center">
						<view class="inviter-primary-cell">
							<text>{{ item.inviter.my_invite_code || '无' }}</text>
							<button
								class="mobile-inviter-action"
								size="mini"
								type="warn"
								:disabled="busy || item.inviter.missing || !canOperateInviterStatus(item.inviter.status)"
								@click="handleInviterStatusAction(item)"
							>
								{{ getInviterStatusActionText(item.inviter) }}
							</button>
						</view>
					</uni-td>
					<uni-td align="center"><text class="mono small">{{ item.inviterId }}</text></uni-td>
					<uni-td align="center">
						<text>注册 {{ formatTimestamp(item.inviter.register_date) }}</text>
						<text class="mono cell-subline">{{ item.inviter.register_ip || '无注册 IP' }}</text>
						<text class="cell-subline">登录 {{ formatTimestamp(item.inviter.login_date) }}</text>
						<text class="mono cell-subline">{{ item.inviter.login_ip || '无登录 IP' }}</text>
					</uni-td>
					<uni-td v-if="scanResultScope === 'time'" align="center">{{ item.scopeMatchedCount }} 人</uni-td>
					<uni-td align="center"><text class="invitee-count">{{ item.invitedCount }} 人</text></uni-td>
					<uni-td align="center">
						<view :class="['ip-risk-cell', item.highestIpRisk]">
							<text class="ip-risk-cell-main">{{ item.highestIpCount ? ('最高 ' + item.highestIpCount + ' 人') : '无有效 IP' }}</text>
							<text v-if="item.highIpGroupCount" class="ip-risk-cell-line high">高风险组 {{ item.highIpGroupCount }} 个</text>
							<text v-if="item.mediumIpGroupCount" class="ip-risk-cell-line medium">中风险组 {{ item.mediumIpGroupCount }} 个</text>
							<text v-if="!item.highIpGroupCount && !item.mediumIpGroupCount" class="ip-risk-cell-line normal">无中高风险组</text>
						</view>
					</uni-td>
					<uni-td align="center"><text>单日 {{ item.maxSameDayCount }}</text><text class="cell-subline">近5日 {{ item.recentFiveDayCount }}</text></uni-td>
					<uni-td align="center"><text :class="['status-text', getStatusClass(item.inviter.status)]">{{ getStatusText(item.inviter.status) }}</text></uni-td>
					<uni-td align="left">
						<text v-for="reason in item.riskReasons" :key="reason" class="reason-line">{{ reason }}</text>
						<text v-if="item.riskReasonCount > item.riskReasons.length" class="reason-line">另有 {{ item.riskReasonCount - item.riskReasons.length }} 条，请进入详情查看</text>
						<text v-if="!item.riskReasonCount">未发现异常阈值</text>
					</uni-td>
					<uni-td align="center">
						<view class="row-actions">
							<button size="mini" type="primary" @click="openInviterDetail(item)">查看详情</button>
							<button
								size="mini"
								type="warn"
								:disabled="busy || item.inviter.missing || !canOperateInviterStatus(item.inviter.status)"
								@click="handleInviterStatusAction(item)"
							>
								{{ getInviterStatusActionText(item.inviter) }}
							</button>
							<button v-if="item.pendingReview" size="mini" type="default" :disabled="busy || !baselineWritable" @click="markInviterReviewed(item)">标记已审核</button>
						</view>
					</uni-td>
				</uni-tr>
			</uni-table>

			<view v-if="filteredScanResults.length > scanPageSize" class="pagination-row">
				<uni-pagination show-icon :page-size="scanPageSize" :current="scanPage" :total="filteredScanResults.length" @change="changeScanPage" />
			</view>
		</uni-card>

		<view v-if="detailLoadTarget" class="inviter-detail-feedback-anchor">
			<uni-card :is-shadow="false" :is-full="false" :border="true" margin="0 0 12px 0">
				<view :class="['detail-load-feedback', { error: detailLoadError }]">
					<view v-if="isQuerying" class="detail-load-spinner"></view>
					<view class="detail-load-copy">
						<text class="detail-load-title">{{ detailLoadError ? '邀请人详情加载失败' : '正在加载邀请人详情' }}</text>
						<text class="detail-load-target">
							邀请码 {{ detailLoadTarget.inviteCode || '未设置' }}，用户 ID：{{ detailLoadTarget.inviterId }}
						</text>
						<text v-if="!detailLoadError" class="detail-load-progress">
							{{ taskStatus.message + (taskStatus.metricText ? '；' + taskStatus.metricText : '') }}
						</text>
						<text v-else class="detail-load-progress">{{ detailLoadError }}</text>
					</view>
					<view v-if="detailLoadError && !isQuerying" class="button-row detail-load-actions">
						<button size="mini" type="primary" @click="retryInviterDetailLoad">重新加载</button>
						<button size="mini" type="default" @click="dismissInviterDetailFeedback">关闭</button>
					</view>
				</view>
			</uni-card>
		</view>

		<template v-if="inviter">
			<view class="inviter-detail-anchor"></view>
			<uni-card :is-shadow="false" :is-full="false" :border="true" margin="0 0 12px 0">
				<view class="section-heading">
					<view>
						<text class="section-title">邀请人详情与处置</text>
						<text class="section-subtitle">完整展示当前选中邀请人名下全部受邀账号；关闭后返回上方风险列表</text>
					</view>
					<view class="button-row">
						<button size="mini" type="default" :disabled="busy" @click="closeInviterDetail">关闭详情</button>
						<button size="mini" type="default" :disabled="busy" @click="editUser(inviter._id)">查看账号</button>
						<button size="mini" type="primary" :disabled="busy" @click="refreshCurrentInviter">刷新数据</button>
						<button
							size="mini"
							type="warn"
							:disabled="busy || inviter.missing || !canOperateInviterStatus(inviter.status)"
							@click="handleInviterStatusAction(inviter)"
						>
							{{ getInviterStatusActionText(inviter) }}
						</button>
					</view>
				</view>
				<view class="inviter-grid">
					<view class="info-item">
						<text class="info-label">邀请人邀请码</text>
						<text class="info-value">{{ inviter.my_invite_code || '无' }}</text>
					</view>
					<view class="info-item wide">
						<text class="info-label">用户 ID</text>
						<text class="info-value mono">{{ inviter._id }}</text>
					</view>
					<view class="info-item">
						<text class="info-label">账号状态</text>
						<text :class="['status-text', getStatusClass(inviter.status)]">{{ getStatusText(inviter.status) }}</text>
					</view>
					<view class="info-item">
						<text class="info-label">受邀账号</text>
						<text class="info-value">{{ invitedUsers.length }} 个</text>
					</view>
					<view class="info-item wide">
						<text class="info-label">邀请人注册</text>
						<text class="info-value">{{ formatTimestamp(inviter.register_date) }} / {{ inviter.register_ip || '无 IP' }}</text>
					</view>
					<view class="info-item wide">
						<text class="info-label">邀请人最后登录</text>
						<text class="info-value">{{ formatTimestamp(inviter.login_date) }} / {{ inviter.login_ip || '无 IP' }}</text>
					</view>
				</view>
				<view class="separate-warning">“封禁／解封邀请人”只处理邀请人本人，不会连带改变任何受邀账号；封禁成功后自动标记为已审核，检测结果继续保留供复查。</view>
			</uni-card>

			<view v-if="loadWarning" class="load-warning">
				<text>{{ loadWarning }}</text>
				<button size="mini" type="primary" :disabled="busy" @click="refreshCurrentInviter">重新完整加载</button>
			</view>
			<view v-if="dataNotice" class="data-notice">{{ dataNotice }}</view>
			<view v-if="relationshipVerified" class="relationship-proof">
				<text class="relationship-proof-title">邀请归属已经按用户 ID 校验</text>
				<text>
					本列表只允许出现 inviter_uid = {{ inviter._id }} 的账号；邀请人邀请码为
					{{ inviter.my_invite_code || '未设置' }}。“账号自身邀请码”是该账号邀请别人时使用的码，不能用来判断本次邀请归属。
				</text>
			</view>
			<view v-else class="relationship-proof invalid">
				<text class="relationship-proof-title">邀请归属尚未通过校验</text>
				<text>账号选择、批量封禁与批量解封已禁用，请重新完整加载当前邀请人详情。</text>
			</view>

			<uni-card :is-shadow="false" :is-full="false" :border="true" margin="0 0 12px 0">
				<view class="section-heading">
					<text class="section-title">IP 风险统计</text>
					<button size="mini" type="default" @click="toggleIpGroups">
						{{ showIpGroups ? '收起 IP 分组' : '展开 IP 分组' }}
					</button>
				</view>
				<view class="inline-note">IP 风险统计同时包含邀请人本人和当前名下受邀账号；邀请人本人不会进入“同 IP 可封禁账号”批量名单。</view>

				<view class="stats-grid">
					<view class="stat-card high">
						<text class="stat-number">{{ riskSummary.highIpCount }}</text>
						<text class="stat-label">高风险 IP</text>
					</view>
					<view class="stat-card medium">
						<text class="stat-number">{{ riskSummary.mediumIpCount }}</text>
						<text class="stat-label">中风险 IP</text>
					</view>
					<view class="stat-card normal">
						<text class="stat-number">{{ riskSummary.normalIpCount }}</text>
						<text class="stat-label">正常 IP</text>
					</view>
					<view class="stat-card unknown">
						<text class="stat-number">{{ riskSummary.unknownAccountCount }}</text>
						<text class="stat-label">无有效 IP 账号</text>
					</view>
				</view>

				<view
					v-if="riskSummary.highIpCount || riskSummary.mediumIpCount"
					:class="['ip-risk-banner', 'detail-ip-risk-banner', { high: riskSummary.highIpCount }]"
				>
					<view class="ip-risk-banner-copy">
						<text class="ip-risk-banner-title">该邀请人存在同 IP 聚集风险</text>
						<text class="ip-risk-banner-detail">高风险 IP 组 {{ riskSummary.highIpCount }} 个，中风险 IP 组 {{ riskSummary.mediumIpCount }} 个</text>
					</view>
					<view class="button-row ip-risk-banner-actions">
						<button v-if="riskSummary.highIpCount" size="mini" type="warn" @click="openIpRiskGroups('high')">查看高风险 IP</button>
						<button v-if="riskSummary.mediumIpCount" size="mini" type="default" @click="openIpRiskGroups('medium')">查看中风险 IP</button>
					</view>
				</view>

				<view v-if="!inviteeActionsReady" class="inline-note danger">当前受邀数据或邀请归属未完整验证，已禁用账号选择、批量封禁与批量解封。</view>

				<view v-if="showIpGroups" class="ip-groups-section">
					<view class="filter-row">
						<text class="filter-label">分组筛选</text>
						<button
							v-for="option in riskFilterOptions"
							:key="'group-' + option.value"
							size="mini"
							:class="{ active: ipGroupRiskFilter === option.value }"
							@click="setIpGroupRiskFilter(option.value)"
						>
							{{ option.label }}
						</button>
					</view>

					<view v-if="pagedIpGroups.length">
						<view v-for="group in pagedIpGroups" :key="group.ip" :class="['ip-group-card', group.riskLevel]">
							<view class="ip-group-main">
								<view>
									<text class="ip-address">{{ group.ip }}</text>
									<text :class="['risk-pill', group.riskLevel]">{{ getRiskText(group.riskLevel) }}</text>
									<text v-if="selectedChangedIpGroups[group.ip]" class="change-badge">{{ selectedChangedIpGroups[group.ip] }}</text>
								</view>
								<text class="ip-total">共 {{ group.count }} 个账号</text>
							</view>
							<view class="ip-evidence">
								<text>注册 IP 命中 {{ group.registerMatchCount }}</text>
								<text>登录 IP 命中 {{ group.loginMatchCount }}</text>
								<text>两字段同时命中 {{ group.bothMatchCount }}</text>
								<text>已封禁 {{ group.bannedCount }}</text>
								<text v-if="group.includesInviter">含邀请人本人</text>
							</view>
							<view class="button-row compact">
								<button size="mini" type="default" @click="filterAccountsByIp(group.ip)">查看该 IP 受邀账号</button>
								<button
									v-if="group.riskLevel === 'high'"
									size="mini"
									type="warn"
									:disabled="busy || !inviteeActionsReady || group.selectableIds.length === 0"
									@click="selectHighRiskGroup(group)"
								>
									预选同 IP 可封禁账号（{{ group.selectableIds.length }}）
								</button>
								<button
									v-if="group.bannedIds.length"
									size="mini"
									type="default"
									:disabled="busy || !inviteeActionsReady"
									@click="selectBannedGroup(group)"
								>
									预选同 IP 已封禁账号（{{ group.bannedIds.length }}）
								</button>
							</view>
						</view>
					</view>
					<view v-else class="empty-state">暂无符合条件的 IP 分组</view>

					<view v-if="filteredIpGroups.length > ipGroupPageSize" class="pagination-row">
						<uni-pagination
							show-icon
							:page-size="ipGroupPageSize"
							:current="ipGroupPage"
							:total="filteredIpGroups.length"
							@change="changeIpGroupPage"
						/>
					</view>
				</view>
			</uni-card>

			<uni-card :is-shadow="false" :is-full="false" :border="true" margin="0 0 12px 0">
				<view class="section-heading account-heading">
					<view>
						<text class="section-title">受邀账号</text>
						<text class="section-subtitle">共 {{ filteredInvitedUsers.length }} 个符合当前筛选</text>
					</view>
					<view class="selection-summary">
						<text>已选 {{ selectedCount }} 个</text>
						<button
							v-if="filteredBannedCount"
							size="mini"
							type="default"
							:disabled="busy || !inviteeActionsReady"
							@click="selectFilteredBannedUsers"
						>
							选择筛选内已封禁（{{ filteredBannedCount }}）
						</button>
						<button size="mini" type="default" :disabled="selectedCount === 0 || busy" @click="clearSelectedUsers">清空选择</button>
						<button
							size="mini"
							type="warn"
							:disabled="selectedBannableCount === 0 || busy || !inviteeActionsReady"
							@click="openBanPreview(selectedBannableIdList)"
						>
							封禁已选（{{ selectedBannableCount }}）
						</button>
						<button
							size="mini"
							type="primary"
							:disabled="selectedBannedCount === 0 || busy || !inviteeActionsReady"
							@click="openUnbanPreview(selectedBannedIdList)"
						>
							解封已选（{{ selectedBannedCount }}）
						</button>
					</view>
				</view>

				<view class="account-filters">
					<view class="filter-row">
						<text class="filter-label">账号筛选</text>
						<button
							v-for="option in accountRiskFilterOptions"
							:key="'account-' + option.value"
							size="mini"
							:class="{ active: accountRiskFilter === option.value }"
							@click="setAccountRiskFilter(option.value)"
						>
							{{ option.label }}
						</button>
					</view>
					<view class="keyword-filter">
						<uni-easyinput
							v-model="accountKeyword"
							placeholder="搜索账号 ID、账号自身邀请码、设备号或 IP"
							@input="onAccountFilterChanged"
							@clear="onAccountFilterChanged"
						/>
					</view>
					<view v-if="activeIpFilter" class="active-ip-filter">
						<text>当前只看 IP：{{ activeIpFilter }}</text>
						<button size="mini" type="default" @click="clearIpFilter">取消 IP 筛选</button>
					</view>
				</view>

				<view v-if="!isQuerying && pagedInvitedUsers.length === 0" class="empty-state table-empty">
					暂无符合条件的受邀账号
				</view>
				<uni-table
					v-else
					ref="inviteeTable"
					:data="pagedInvitedUsers"
					row-key="_id"
					type="selection"
					:loading="isQuerying"
					emptyText="暂无符合条件的受邀账号"
					border
					stripe
					@selection-change="selectionChange"
				>
					<uni-tr>
						<uni-th width="90" align="center">账号状态</uni-th>
						<uni-th width="90" align="center">风险等级</uni-th>
						<uni-th width="170" align="center">邀请归属 / 自身邀请码</uni-th>
						<uni-th width="190" align="center">受邀账号 ID</uni-th>
						<uni-th width="155" align="center">邀请时间</uni-th>
						<uni-th width="190" align="center">注册时间 / IP</uni-th>
						<uni-th width="190" align="center">最后登录时间 / IP</uni-th>
						<uni-th width="145" align="center">设备号</uni-th>
						<uni-th width="230" align="center">风险依据</uni-th>
						<uni-th width="80" align="center">操作</uni-th>
					</uni-tr>
					<uni-tr
						v-for="user in pagedInvitedUsers"
						:key="user._id"
						:key-value="user._id"
						:disabled="!inviteeActionsReady"
					>
						<uni-td align="center">
							<text :class="['status-text', getStatusClass(user.status)]">{{ getStatusText(user.status) }}</text>
						</uni-td>
						<uni-td align="center">
							<text :class="['risk-pill', getAccountRiskLevel(user._id)]">
								{{ getRiskText(getAccountRiskLevel(user._id)) }}
							</text>
						</uni-td>
						<uni-td align="center">
							<text class="relationship-code">{{ relationshipVerified ? '归属：邀请人 ID 已匹配' : '归属：尚未验证' }}</text>
							<text v-if="relationshipVerified" class="cell-subline">邀请人码：{{ inviter.my_invite_code || '未设置' }}</text>
							<text v-else class="cell-subline relationship-invalid-text">当前行禁止操作</text>
							<text class="cell-subline">自身：{{ user.my_invite_code || '无' }}</text>
							<text v-if="selectedNewInviteeIds[user._id]" class="change-badge cell-subline">新增待审核</text>
						</uni-td>
						<uni-td align="center"><text class="mono small">{{ user._id }}</text></uni-td>
						<uni-td align="center">{{ formatTimestamp(user.invite_time) }}</uni-td>
						<uni-td align="center">
							<text>{{ formatTimestamp(user.register_date) }}</text>
							<text class="mono cell-subline">{{ user.register_ip || '无' }}</text>
						</uni-td>
						<uni-td align="center">
							<text>{{ formatTimestamp(user.login_date) }}</text>
							<text class="mono cell-subline">{{ user.login_ip || '无' }}</text>
						</uni-td>
						<uni-td align="center"><text class="mono small">{{ user.device_oaid || '无' }}</text></uni-td>
						<uni-td align="left"><text v-for="reason in accountRiskReasonsById[user._id] || ['无有效 IP']" :key="reason" class="reason-line">{{ reason }}</text></uni-td>
						<uni-td align="center">
							<button size="mini" type="primary" @click="editUser(user._id)">查看</button>
						</uni-td>
					</uni-tr>
				</uni-table>

				<view v-if="filteredInvitedUsers.length > accountPageSize" class="pagination-row">
					<uni-pagination
						show-icon
						:page-size="accountPageSize"
						:current="accountPage"
						:total="filteredInvitedUsers.length"
						@change="changeAccountPage"
					/>
				</view>
			</uni-card>
		</template>

		<uni-popup ref="banPreviewPopup" type="center" @change="onPreviewPopupChange">
			<view v-if="previewOpen" class="popup-card">
				<view class="popup-heading">
					<text class="popup-title">{{ accountAction === 'ban' ? '确认封禁受邀账号' : '确认批量解封受邀账号' }}</text>
					<text class="popup-close" @click="closeBanPreview">×</text>
				</view>
				<view v-if="accountAction === 'ban'" class="popup-warning">
					仅封禁 inviter_uid 仍等于当前邀请人 ID 的所列账号；邀请人邀请码：
					{{ inviter ? (inviter.my_invite_code || '未设置') : '未设置' }}。不会封禁邀请人本人。
				</view>
				<view v-else class="popup-warning unban">
					仅解封 inviter_uid 仍等于当前邀请人 ID 且 status 仍严格等于 3 的账号，统一恢复为正常（status = 0）；status = 1 不参与本功能。无需新增云端 Schema 字段。
				</view>
				<view class="popup-summary">最终待{{ accountAction === 'ban' ? '封禁' : '解封' }} {{ previewUserIds.length }} 个账号</view>
				<scroll-view scroll-y class="popup-list">
					<view v-for="user in previewPageUsers" :key="user._id" class="popup-list-row">
						<view>
							<text>邀请人邀请码：{{ inviter ? (inviter.my_invite_code || '未设置') : '未设置' }}</text>
							<text class="popup-id">账号自身邀请码：{{ user.my_invite_code || '无' }}</text>
							<text class="popup-id">{{ user._id }}</text>
							<text v-if="accountAction === 'unban'" class="restore-target">{{ getUnbanRestoreText(user) }}</text>
							<view class="preview-ips">
								<text>注册：{{ formatTimestamp(user.register_date) }} / {{ user.register_ip || '无' }}</text>
								<text>登录：{{ formatTimestamp(user.login_date) }} / {{ user.login_ip || '无' }}</text>
							</view>
						</view>
						<button size="mini" type="default" @click="removePreviewUser(user._id)">移出</button>
					</view>
				</scroll-view>
				<uni-pagination
					v-if="previewUserIds.length > popupPageSize"
					show-icon
					:page-size="popupPageSize"
					:current="previewPage"
					:total="previewUserIds.length"
					@change="changePreviewPage"
				/>
				<view class="popup-actions">
					<button size="mini" type="default" :disabled="isBanning" @click="closeBanPreview">取消</button>
					<button :type="accountAction === 'ban' ? 'warn' : 'primary'" size="mini" :disabled="previewUserIds.length === 0 || isBanning" @click="confirmSelectedAccountAction">
						确认{{ accountAction === 'ban' ? '封禁' : '解封' }} {{ previewUserIds.length }} 个账号
					</button>
				</view>
			</view>
		</uni-popup>

		<uni-popup ref="banResultPopup" type="center" @change="onResultPopupChange">
			<view v-if="resultOpen" class="popup-card result-popup">
				<view class="popup-heading">
					<text class="popup-title">批量{{ accountAction === 'ban' ? '封禁' : '解封' }}结果</text>
					<text class="popup-close" @click="closeBanResult">×</text>
				</view>
				<view class="result-summary-grid">
					<view class="result-count success"><text>{{ banResult.success.length }}</text><text>成功</text></view>
					<view class="result-count skipped"><text>{{ banResult.skipped.length }}</text><text>跳过</text></view>
					<view class="result-count failed"><text>{{ banResult.failed.length }}</text><text>失败</text></view>
				</view>
				<view class="filter-row result-tabs">
					<button size="mini" :class="{ active: resultTab === 'success' }" @click="setResultTab('success')">成功</button>
					<button size="mini" :class="{ active: resultTab === 'skipped' }" @click="setResultTab('skipped')">跳过</button>
					<button size="mini" :class="{ active: resultTab === 'failed' }" @click="setResultTab('failed')">失败</button>
				</view>
				<scroll-view scroll-y class="popup-list">
					<view v-for="entry in resultPageRows" :key="entry.id + entry.reason" class="popup-list-row result-row">
						<view>
							<text>账号自身邀请码：{{ entry.accountOwnInviteCode || '无' }}</text>
							<text class="popup-id">{{ entry.id }}</text>
						</view>
						<text class="result-reason">{{ entry.reason }}</text>
					</view>
				</scroll-view>
				<uni-pagination
					v-if="resultRows.length > popupPageSize"
					show-icon
					:page-size="popupPageSize"
					:current="resultPage"
					:total="resultRows.length"
					@change="changeResultPage"
				/>
				<view class="popup-actions">
					<button size="mini" type="default" @click="closeBanResult">关闭</button>
					<button v-if="failedUserIds.length" size="mini" type="warn" :disabled="busy || !inviteeActionsReady" @click="retryFailedUsers">
						只重试{{ accountAction === 'ban' ? '封禁' : '解封' }}失败项（{{ failedUserIds.length }}）
					</button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	const {
		analyzeInviterIpAccounts,
		chunkArray
	} = require('./violation-invitation-v2.utils.js')
	const { normalizeTimestamp, getBusinessDayKey, RISK_RANK } = require('./violation-invitation-v2.scan.js')
	const discoveryMixin = require('./violation-invitation-v2.discovery.js')
	const {
		isBannableStatus,
		isUnbannableStatus
	} = require('./violation-invitation-v2.account-action.js')

	const db = uniCloud.database()
	const dbCmd = db.command
	const userCollection = db.collection('user-accounts')
	const BAN_BATCH_SIZE = 50
	function emptyRiskSummary() {
		return {
			normalIpCount: 0,
			mediumIpCount: 0,
			highIpCount: 0,
			unknownAccountCount: 0
		}
	}

	export default {
		mixins: [discoveryMixin],
		data() {
			return {
				inviteCodeInput: '',
				inviter: null,
				invitedUsers: [],
				accountById: {},
				accountIpsById: {},
				accountRiskById: {},
				accountRiskReasonsById: {},
				ipGroups: [],
				riskSummary: emptyRiskSummary(),
				isQuerying: false,
				isBanning: false,
				queryComplete: false,
				relationshipVerified: false,
				loadWarning: '',
				dataNotice: '',
				queryRunId: 0,
				taskStatus: {
					visible: false,
					message: '',
					metricText: '',
					determinate: false,
					progress: 0,
					error: false
				},
				showIpGroups: false,
				ipGroupRiskFilter: 'all',
				ipGroupPage: 1,
				ipGroupPageSize: 15,
				accountRiskFilter: 'all',
				accountKeyword: '',
				activeIpFilter: '',
				accountPage: 1,
				accountPageSize: 50,
				selectedUserIds: {},
				syncingSelection: false,
				previewOpen: false,
				accountAction: 'ban',
				previewUserIds: [],
				previewPage: 1,
				resultOpen: false,
				resultTab: 'success',
				resultPage: 1,
				popupPageSize: 20,
				banResult: {
					success: [],
					skipped: [],
					failed: []
				},
				failedUserIds: [],
				riskFilterOptions: [
					{ value: 'all', label: '全部' },
					{ value: 'high', label: '高风险' },
					{ value: 'medium', label: '中风险' },
					{ value: 'normal', label: '正常' }
				],
				accountRiskFilterOptions: [
					{ value: 'all', label: '全部' },
					{ value: 'high', label: '高风险' },
					{ value: 'medium', label: '中风险' },
					{ value: 'normal', label: '正常' },
					{ value: 'unknown', label: '无有效 IP' },
					{ value: 'banned', label: '已封禁' }
				]
			}
		},
		computed: {
			busy() {
				return this.isQuerying || this.isBanning || this.isReviewingBaseline
			},
			inviteeActionsReady() {
				return Boolean(this.queryComplete && this.relationshipVerified && this.inviter && !this.inviter.missing)
			},
			filteredIpGroups() {
				if (this.ipGroupRiskFilter === 'all') return this.ipGroups
				return this.ipGroups.filter(group => group.riskLevel === this.ipGroupRiskFilter)
			},
			pagedIpGroups() {
				const start = (this.ipGroupPage - 1) * this.ipGroupPageSize
				return this.filteredIpGroups.slice(start, start + this.ipGroupPageSize)
			},
			filteredInvitedUsers() {
				const keyword = this.accountKeyword.trim().toLowerCase()
				return this.invitedUsers
					.filter(user => {
						const riskLevel = this.getAccountRiskLevel(user._id)
						if (this.accountRiskFilter === 'banned' && !this.isBannedStatus(user.status)) return false
						if (this.accountRiskFilter !== 'all' && this.accountRiskFilter !== 'banned' && riskLevel !== this.accountRiskFilter) return false
						if (this.activeIpFilter && !(this.accountIpsById[user._id] || []).includes(this.activeIpFilter)) return false
						if (!keyword) return true
						return [user._id, user.my_invite_code, user.device_oaid, user.register_ip, user.login_ip]
							.some(value => String(value || '').toLowerCase().includes(keyword))
					})
					.slice()
					.sort((left, right) => {
						const riskDifference = RISK_RANK[this.getAccountRiskLevel(right._id)] - RISK_RANK[this.getAccountRiskLevel(left._id)]
						if (riskDifference !== 0) return riskDifference
						const timeDifference = normalizeTimestamp(right.invite_time) - normalizeTimestamp(left.invite_time)
						if (timeDifference !== 0) return timeDifference
						return left._id.localeCompare(right._id)
					})
			},
			pagedInvitedUsers() {
				const start = (this.accountPage - 1) * this.accountPageSize
				return this.filteredInvitedUsers.slice(start, start + this.accountPageSize)
			},
			selectedUserIdList() {
				return Object.keys(this.selectedUserIds).filter(id => this.selectedUserIds[id])
			},
			selectedCount() {
				return this.selectedUserIdList.length
			},
			selectedBannableIdList() {
				return this.selectedUserIdList.filter(id => {
					const user = this.accountById[id]
					return user && isBannableStatus(user.status)
				})
			},
			selectedBannedIdList() {
				return this.selectedUserIdList.filter(id => {
					const user = this.accountById[id]
					return user && this.isBannedStatus(user.status)
				})
			},
			selectedBannableCount() {
				return this.selectedBannableIdList.length
			},
			selectedBannedCount() {
				return this.selectedBannedIdList.length
			},
			filteredBannedCount() {
				return this.filteredInvitedUsers.filter(user => this.isBannedStatus(user.status)).length
			},
			previewPageUsers() {
				const start = (this.previewPage - 1) * this.popupPageSize
				return this.previewUserIds
					.slice(start, start + this.popupPageSize)
					.map(id => this.accountById[id])
					.filter(Boolean)
			},
			resultRows() {
				return this.banResult[this.resultTab] || []
			},
			resultPageRows() {
				const start = (this.resultPage - 1) * this.popupPageSize
				return this.resultRows.slice(start, start + this.popupPageSize)
			}
		},
		onLoad(options) {
			this.initializeDiscovery(options)
		},
		onShow() {
			this.businessToday = getBusinessDayKey(Date.now())
		},
		onUnload() {
			this.queryRunId++
			this.disposeDiscovery()
		},
		methods: {
			setTask(message, metrics = null, error = false) {
				const current = metrics && Number(metrics.current)
				const total = metrics && Number(metrics.total)
				const determinate = Boolean(
					metrics &&
					metrics.determinate !== false &&
					Number.isFinite(current) &&
					Number.isFinite(total) &&
					total > 0 &&
					current >= 0
				)
				const boundedCurrent = determinate ? Math.min(current, total) : 0
				this.taskStatus = {
					visible: true,
					message,
					metricText: metrics && metrics.metricText
						? String(metrics.metricText)
						: (determinate ? `${boundedCurrent} / ${total}` : '处理中'),
					determinate,
					progress: determinate ? Math.round((boundedCurrent / total) * 100) : 0,
					error
				}
			},
			clearTask(delay = 0) {
				const runId = this.queryRunId
				setTimeout(() => {
					if (runId === this.queryRunId && !this.busy) {
						this.taskStatus.visible = false
					}
				}, delay)
			},
			resetQueryResult() {
				this.selectedScanInviterId = ''
				this.detailLoadTarget = null
				this.detailLoadError = ''
				this.selectedNewInviteeIds = {}
				this.selectedChangedIpGroups = {}
				this.inviter = null
				this.invitedUsers = []
				this.accountById = {}
				this.accountIpsById = {}
				this.accountRiskById = {}
				this.accountRiskReasonsById = {}
				this.ipGroups = []
				this.riskSummary = emptyRiskSummary()
				this.queryComplete = false
				this.relationshipVerified = false
				this.loadWarning = ''
				this.dataNotice = ''
				this.accountPage = 1
				this.ipGroupPage = 1
				this.showIpGroups = false
				this.ipGroupRiskFilter = 'all'
				this.activeIpFilter = ''
				this.accountKeyword = ''
				this.clearSelectedUsers()
			},
			async refreshCurrentInviter() {
				if (!this.inviter || this.busy) return
				await this.refreshSelectedInviterDetail()
			},
			rebuildAccountMap(users) {
				const map = {}
				users.forEach(user => {
					if (user && user._id) map[user._id] = user
				})
				this.accountById = map
			},
			assertInviteeOwnership(users, inviterId) {
				if (!Array.isArray(users)) throw new Error('受邀账号数据结构无效')
				if (typeof inviterId !== 'string' || !inviterId || inviterId.trim() !== inviterId) {
					throw new Error('当前邀请人 ID 无效，无法核对邀请归属')
				}
				const seenIds = new Set()
				users.forEach((user, index) => {
					const userId = user && user._id
					if (typeof userId !== 'string' || !userId || userId.trim() !== userId) {
						throw new Error(`第 ${index + 1} 条受邀账号缺少有效用户 ID`)
					}
					if (userId === inviterId) throw new Error('受邀账号列表错误包含邀请人本人')
					if (seenIds.has(userId)) throw new Error(`受邀账号 ${userId} 重复出现，已停止操作`)
					if (user.inviter_uid !== inviterId) {
						throw new Error(`账号 ${userId} 的 inviter_uid 与当前邀请人不一致，已停止操作`)
					}
					seenIds.add(userId)
				})
			},
			applyAccountAnalysis(users) {
				this.relationshipVerified = false
				const inviterId = this.inviter && this.inviter._id
				this.assertInviteeOwnership(users, inviterId)
				this.invitedUsers = users
				this.rebuildAccountMap(users)
				const analysis = analyzeInviterIpAccounts(this.inviter, users)
				this.ipGroups = analysis.groups
				this.accountIpsById = analysis.accountIpsById
				this.accountRiskById = analysis.accountRiskById
				const groupByIp = new Map(analysis.groups.map(group => [group.ip, group]))
				const reasonsById = {}
				Object.keys(analysis.accountIpsById).forEach(id => {
					reasonsById[id] = analysis.accountIpsById[id].map(ip => {
						const group = groupByIp.get(ip)
						return group ? `${ip}（同 IP ${group.count} 个账号）` : ip
					})
				})
				this.accountRiskReasonsById = reasonsById
				this.riskSummary = analysis.summary
				this.relationshipVerified = true
				this.accountPage = 1
				this.ipGroupPage = 1
			},
			toggleIpGroups() {
				this.showIpGroups = !this.showIpGroups
			},
			openIpRiskGroups(level) {
				if (!['high', 'medium'].includes(level)) return
				this.showIpGroups = true
				this.ipGroupRiskFilter = level
				this.ipGroupPage = 1
			},
			setIpGroupRiskFilter(value) {
				this.ipGroupRiskFilter = value
				this.ipGroupPage = 1
			},
			changeIpGroupPage(event) {
				this.ipGroupPage = event.current
			},
			filterAccountsByIp(ip) {
				this.activeIpFilter = ip
				this.accountPage = 1
				this.$nextTick(() => this.syncVisibleSelection())
			},
			clearIpFilter() {
				this.activeIpFilter = ''
				this.accountPage = 1
				this.$nextTick(() => this.syncVisibleSelection())
			},
			setAccountRiskFilter(value) {
				this.accountRiskFilter = value
				this.accountPage = 1
				this.$nextTick(() => this.syncVisibleSelection())
			},
			onAccountFilterChanged() {
				this.accountPage = 1
				this.$nextTick(() => this.syncVisibleSelection())
			},
			changeAccountPage(event) {
				this.accountPage = event.current
				this.$nextTick(() => this.syncVisibleSelection())
			},
			selectionChange(event) {
				if (this.syncingSelection || !this.inviteeActionsReady) return
				const detail = event.detail || {}
				const selectedIds = new Set()
				if (Array.isArray(detail.value) && detail.value.length) {
					detail.value.forEach(user => {
						if (user && user._id) selectedIds.add(user._id)
					})
				} else {
					;(detail.index || []).forEach(index => {
						const user = this.pagedInvitedUsers[index]
						if (user) selectedIds.add(user._id)
					})
				}

				this.pagedInvitedUsers.forEach(user => {
					if (selectedIds.has(user._id)) {
						this.$set(this.selectedUserIds, user._id, true)
					} else {
						this.$delete(this.selectedUserIds, user._id)
					}
				})
			},
			syncVisibleSelection() {
				this.$nextTick(() => {
					const table = this.$refs.inviteeTable
					if (!table) return
					this.syncingSelection = true
					table.clearSelection()
					const selectedIndexes = []
					this.pagedInvitedUsers.forEach((user, index) => {
						if (this.selectedUserIds[user._id]) selectedIndexes.push(index)
					})
					if (selectedIndexes.length) table.toggleRowSelection(selectedIndexes, true)
					this.$nextTick(() => {
						this.syncingSelection = false
					})
				})
			},
			selectHighRiskGroup(group) {
				if (!this.inviteeActionsReady || this.busy || group.riskLevel !== 'high') return
				let added = 0
				group.selectableIds.forEach(id => {
					if (!this.selectedUserIds[id]) added++
					this.$set(this.selectedUserIds, id, true)
				})
				this.syncVisibleSelection()
				uni.showToast({ title: `已新增选择 ${added} 个账号`, icon: 'none' })
			},
			selectBannedGroup(group) {
				if (!this.inviteeActionsReady || this.busy || !group || !Array.isArray(group.bannedIds)) return
				let added = 0
				group.bannedIds.forEach(id => {
					if (!this.selectedUserIds[id]) added++
					this.$set(this.selectedUserIds, id, true)
				})
				this.syncVisibleSelection()
				uni.showToast({ title: `已新增选择 ${added} 个已封禁账号`, icon: 'none' })
			},
			selectFilteredBannedUsers() {
				if (!this.inviteeActionsReady || this.busy) return
				let added = 0
				this.filteredInvitedUsers.forEach(user => {
					if (!this.isBannedStatus(user.status)) return
					if (!this.selectedUserIds[user._id]) added++
					this.$set(this.selectedUserIds, user._id, true)
				})
				this.syncVisibleSelection()
				uni.showToast({ title: `已新增选择 ${added} 个已封禁账号`, icon: 'none' })
			},
			clearSelectedUsers() {
				this.selectedUserIds = {}
				this.syncVisibleSelection()
			},
			openBanPreview(ids) {
				this.openAccountActionPreview('ban', ids)
			},
			openUnbanPreview(ids) {
				this.openAccountActionPreview('unban', ids)
			},
			openAccountActionPreview(action, ids) {
				if (!this.inviteeActionsReady || this.busy) return
				if (!['ban', 'unban'].includes(action)) return
				const sourceIds = Array.isArray(ids) ? ids : this.selectedUserIdList
				const validIds = Array.from(new Set(sourceIds)).filter(id => {
					const user = this.accountById[id]
					if (!user || id === this.inviter._id || user.inviter_uid !== this.inviter._id) return false
					return action === 'ban' ? isBannableStatus(user.status) : isUnbannableStatus(user.status)
				})
				if (!validIds.length) {
					uni.showToast({ title: `没有可${action === 'ban' ? '封禁' : '解封'}的已选账号`, icon: 'none' })
					return
				}
				this.accountAction = action
				this.previewUserIds = validIds
				this.previewPage = 1
				this.previewOpen = true
				this.$nextTick(() => this.$refs.banPreviewPopup.open())
			},
			removePreviewUser(id) {
				this.previewUserIds = this.previewUserIds.filter(userId => userId !== id)
				this.$delete(this.selectedUserIds, id)
				const maxPage = Math.max(1, Math.ceil(this.previewUserIds.length / this.popupPageSize))
				this.previewPage = Math.min(this.previewPage, maxPage)
				this.syncVisibleSelection()
			},
			changePreviewPage(event) {
				this.previewPage = event.current
			},
			closeBanPreview() {
				if (this.$refs.banPreviewPopup) this.$refs.banPreviewPopup.close()
			},
			onPreviewPopupChange(event) {
				if (!event.show) this.previewOpen = false
			},
			getUnbanRestoreText(user) {
				return isUnbannableStatus(user && user.status)
					? '恢复目标：正常（status 3 → 0）'
					: '当前状态不是严格的 status = 3，将安全跳过'
			},
			async confirmSelectedAccountAction() {
				const ids = this.previewUserIds.slice()
				this.closeBanPreview()
				if (this.accountAction === 'unban') {
					await this.executeBatchUnban(ids)
				} else {
					await this.executeBatchBan(ids)
				}
			},
			async executeBatchBan(ids) {
				return this.executeBatchAccountAction(ids, 'ban')
			},
			async executeBatchUnban(ids) {
				return this.executeBatchAccountAction(ids, 'unban')
			},
			async executeBatchAccountAction(ids, action) {
				if (this.busy || !this.inviteeActionsReady) return
				if (!['ban', 'unban'].includes(action)) return
				const targetIds = Array.from(new Set(ids)).filter(Boolean)
				if (!targetIds.length) return
				const inviterTarget = this.resolveInviterBanTarget(this.inviter)
				if (!inviterTarget) {
					this.queryComplete = false
					this.relationshipVerified = false
					this.loadWarning = '邀请人身份无效，已禁用账号状态操作。请重新完整加载。'
					return
				}
				try {
					this.assertInviteeOwnership(targetIds.map(id => this.accountById[id]), inviterTarget.inviterId)
				} catch (error) {
					this.queryComplete = false
					this.relationshipVerified = false
					this.loadWarning = `操作前邀请归属校验失败：${this.getErrorMessage(error)}。请重新完整加载。`
					this.setTask(this.loadWarning, { metricText: '已阻止写入' }, true)
					return
				}

				this.accountAction = action
				this.isBanning = true
				this.banResult = { success: [], skipped: [], failed: [] }
				this.failedUserIds = []
				const chunks = chunkArray(targetIds, BAN_BATCH_SIZE)
				const actionLabel = action === 'ban' ? '封禁' : '解封'
				let fatalError = null
				let contextInvalid = false

				try {
					for (let index = 0; index < chunks.length; index++) {
						const chunk = chunks[index]
						this.setTask(`正在${actionLabel}受邀账号：第 ${index + 1} / ${chunks.length} 批`, {
							current: index,
							total: chunks.length,
							metricText: `已完成 ${index} / ${chunks.length} 批`
						})
						if (action === 'ban') {
							await this.processBanChunk(chunk, inviterTarget)
						} else {
							await this.processUnbanChunk(chunk, inviterTarget)
						}
						this.setTask(`正在${actionLabel}受邀账号：第 ${index + 1} / ${chunks.length} 批`, {
							current: index + 1,
							total: chunks.length,
							metricText: `已完成 ${index + 1} / ${chunks.length} 批`
						})
					}
				} catch (error) {
					console.error(`批量${actionLabel}异常:`, error)
					fatalError = error
					if (error && error.inviteeBanContextInvalid) contextInvalid = true
					targetIds.forEach(id => {
						if (!this.hasBanResult(id)) {
							this.addBanResult('failed', id, `批处理被中断：${this.getErrorMessage(error)}`)
						}
					})
				}
				targetIds.forEach(id => {
					if (!this.hasBanResult(id)) {
						this.addBanResult('failed', id, '未获得明确处理结果，请重试该账号')
					}
				})

				try {
					this.reconcileBanResults(action)
				} catch (error) {
					console.error(`同步批量${actionLabel}结果失败:`, error)
					fatalError = fatalError || error
					this.queryComplete = false
					this.loadWarning = `${actionLabel}写入已结束，但页面结果同步失败。请重新完整加载后再继续操作。`
				} finally {
					if (contextInvalid) {
						this.queryComplete = false
						this.relationshipVerified = false
						this.loadWarning = `邀请人身份或邀请码已经变化，已停止后续${actionLabel}。此前已成功的批次不会被伪装为失败；请重新完整加载后核对结果。`
					}
					this.isBanning = false
					this.syncVisibleSelection()
				}

				const message = `${actionLabel}完成：成功 ${this.banResult.success.length}，跳过 ${this.banResult.skipped.length}，失败 ${this.banResult.failed.length}`
				this.setTask(
					fatalError ? `${message}；${this.getErrorMessage(fatalError)}` : message,
					{ metricText: fatalError || this.banResult.failed.length ? '部分失败' : '已完成' },
					Boolean(fatalError || this.banResult.failed.length)
				)
				this.openBanResult()
			},
			async assertAccountActionInviter(inviterTarget) {
				try {
					if (!inviterTarget || typeof inviterTarget.inviterId !== 'string') throw new Error('邀请人身份快照无效')
					const currentInviter = await this.readInviterBanAccount(inviterTarget.inviterId)
					this.validateInviterBanAccount(currentInviter, inviterTarget)
				} catch (error) {
					const contextError = new Error(`邀请人身份复核失败：${this.getErrorMessage(error)}`)
					contextError.inviteeBanContextInvalid = true
					throw contextError
				}
			},
			async readAccountActionRows(ids) {
				const response = await userCollection.where({
					_id: dbCmd.in(ids)
				}).field({
					_id: true,
					inviter_uid: true,
					my_invite_code: true,
					status: true
				}).get()
				const data = response && response.result && response.result.data
				if (!Array.isArray(data)) throw new Error('账号状态读取结果无效')
				return data
			},
			async processBanChunk(ids, inviterTarget) {
				let beforeData
				try {
					await this.assertAccountActionInviter(inviterTarget)
				} catch (error) {
					ids.forEach(id => this.addBanResult('failed', id, this.getErrorMessage(error)))
					throw error
				}
				try {
					beforeData = await this.readAccountActionRows(ids)
				} catch (error) {
					ids.forEach(id => this.addBanResult('failed', id, `封禁前邀请归属读取失败：${this.getErrorMessage(error)}`))
					return
				}

				const inviterId = inviterTarget.inviterId
				const beforeMap = new Map(beforeData.map(user => [user._id, user]))
				const eligibleIds = []
				ids.forEach(id => {
					const user = beforeMap.get(id)
					if (id === inviterId) {
						this.addBanResult('skipped', id, '邀请人本人必须通过独立按钮处理')
					} else if (!user) {
						this.addBanResult('skipped', id, '账号不存在或已删除', { removeFromCurrent: true })
					} else if (user.inviter_uid !== inviterId) {
						this.addBanResult('skipped', id, '邀请关系已变化', { removeFromCurrent: true })
					} else if (this.isBannedStatus(user.status)) {
						this.addBanResult('skipped', id, '账号已被封禁', { latestStatus: 3 })
					} else if (!isBannableStatus(user.status)) {
						this.addBanResult('skipped', id, `账号当前状态为${this.getStatusText(user.status)}，批量封禁只处理正常账号`)
					} else {
						eligibleIds.push(id)
					}
				})

				if (!eligibleIds.length) return
				const writeErrors = new Map()
				try {
					await userCollection.where({
						_id: dbCmd.in(eligibleIds),
						inviter_uid: inviterId,
						status: 0
					}).update({
						status: 3
					})
				} catch (error) {
					eligibleIds.forEach(id => writeErrors.set(id, error))
				}

				try {
					const data = await this.readAccountActionRows(eligibleIds)
					const afterMap = new Map(data.map(user => [user._id, user]))
					eligibleIds.forEach(id => {
						const user = afterMap.get(id)
						const writeError = writeErrors.get(id)
						if (!user) {
							this.addBanResult('skipped', id, '执行后账号不存在', { removeFromCurrent: true })
						} else if (user.inviter_uid !== inviterId) {
							this.addBanResult('skipped', id, '执行期间邀请关系发生变化', { removeFromCurrent: true })
						} else if (isUnbannableStatus(user.status)) {
							this.addBanResult('success', id, '已封禁（status 0 → 3）')
						} else {
							this.addBanResult('failed', id, writeError ? `写入失败：${this.getErrorMessage(writeError)}` : '写入后状态校验未通过', { latestStatus: user.status })
						}
					})
				} catch (error) {
					eligibleIds.forEach(id => this.addBanResult('failed', id, `写入后校验失败：${this.getErrorMessage(error)}`))
				}
			},
			async processUnbanChunk(ids, inviterTarget) {
				try {
					await this.assertAccountActionInviter(inviterTarget)
				} catch (error) {
					ids.forEach(id => this.addBanResult('failed', id, this.getErrorMessage(error)))
					throw error
				}

				let beforeData
				try {
					beforeData = await this.readAccountActionRows(ids)
				} catch (error) {
					ids.forEach(id => this.addBanResult('failed', id, `解封前邀请归属读取失败：${this.getErrorMessage(error)}`))
					return
				}

				const inviterId = inviterTarget.inviterId
				const beforeMap = new Map(beforeData.map(user => [user._id, user]))
				const eligibleIds = []
				ids.forEach(id => {
					const user = beforeMap.get(id)
					if (id === inviterId) {
						this.addBanResult('skipped', id, '邀请人本人必须通过独立流程处理')
					} else if (!user) {
						this.addBanResult('skipped', id, '账号不存在或已删除', { removeFromCurrent: true })
					} else if (user.inviter_uid !== inviterId) {
						this.addBanResult('skipped', id, '邀请关系已变化', { removeFromCurrent: true })
					} else if (!isUnbannableStatus(user.status)) {
						this.addBanResult('skipped', id, '账号当前已不是封禁状态', { latestStatus: user.status })
					} else {
						eligibleIds.push(id)
					}
				})

				if (!eligibleIds.length) return
				let writeError = null
				try {
					await userCollection.where({
						_id: dbCmd.in(eligibleIds),
						inviter_uid: inviterId,
						status: 3
					}).update({ status: 0 })
				} catch (error) {
					writeError = error
				}

				try {
					const data = await this.readAccountActionRows(eligibleIds)
					const afterMap = new Map(data.map(user => [user._id, user]))
					eligibleIds.forEach(id => {
						const user = afterMap.get(id)
						if (!user) {
							this.addBanResult('skipped', id, '执行后账号不存在', { removeFromCurrent: true })
						} else if (user.inviter_uid !== inviterId) {
							this.addBanResult('skipped', id, '执行期间邀请关系发生变化', { removeFromCurrent: true })
						} else if (user.status === 0) {
							this.addBanResult('success', id, '已解封（status 3 → 0）', { restoredStatus: 0 })
						} else {
							this.addBanResult('failed', id, writeError ? `写入失败：${this.getErrorMessage(writeError)}` : '写入后解封状态校验未通过', { latestStatus: user.status })
						}
					})
				} catch (error) {
					eligibleIds.forEach(id => {
						if (!this.hasBanResult(id)) this.addBanResult('failed', id, `解封写入后校验失败：${this.getErrorMessage(error)}`)
					})
				}
			},
			hasBanResult(id) {
				return ['success', 'skipped', 'failed'].some(type => this.banResult[type].some(item => item.id === id))
			},
			addBanResult(type, id, reason, metadata = {}) {
				if (this.hasBanResult(id)) return
				const user = this.accountById[id]
				this.banResult[type].push({
					id,
					accountOwnInviteCode: user ? user.my_invite_code : '',
					reason,
					...metadata
				})
			},
			reconcileBanResults(action) {
				if (!['ban', 'unban'].includes(action)) throw new Error('账号状态操作类型无效')
				const removedIds = new Set(this.banResult.skipped.filter(item => item.removeFromCurrent).map(item => item.id))
				const successById = new Map(this.banResult.success.map(item => [item.id, item]))
				const latestStatusById = new Map(
					this.banResult.skipped
						.filter(item => Number.isInteger(item.latestStatus))
						.map(item => [item.id, item.latestStatus])
				)
				const inviterId = this.inviter && this.inviter._id

				const nextUsers = this.invitedUsers
					.filter(user => !removedIds.has(user._id) && user._id !== inviterId)
					.map(user => {
						const nextUser = { ...user }
						const success = successById.get(user._id)
						if (success && action === 'ban') {
							nextUser.status = 3
						} else if (success && action === 'unban') {
							if (success.restoredStatus !== 0) {
								throw new Error(`账号 ${user._id} 的解封恢复状态无效`)
							}
							nextUser.status = 0
						} else if (latestStatusById.has(user._id)) {
							nextUser.status = latestStatusById.get(user._id)
						}
						return nextUser
					})

				this.banResult.success.forEach(item => this.$delete(this.selectedUserIds, item.id))
				this.banResult.skipped.forEach(item => this.$delete(this.selectedUserIds, item.id))
				this.banResult.failed.forEach(item => this.$set(this.selectedUserIds, item.id, true))
				this.failedUserIds = Array.from(new Set(this.banResult.failed.map(item => item.id)))
				this.applyAccountAnalysis(nextUsers)
				this.updateDiscoveryDetailCache(this.inviter && this.inviter._id, nextUsers)

				if (removedIds.size > 0) {
					this.dataNotice = `执行时发现 ${removedIds.size} 个账号已删除或邀请关系已变化，已从当前列表和风险统计中移除。`
				}
			},
			openBanResult() {
				this.resultTab = this.banResult.failed.length ? 'failed' : (this.banResult.skipped.length ? 'skipped' : 'success')
				this.resultPage = 1
				this.resultOpen = true
				this.$nextTick(() => this.$refs.banResultPopup.open())
			},
			closeBanResult() {
				if (this.$refs.banResultPopup) this.$refs.banResultPopup.close()
			},
			onResultPopupChange(event) {
				if (!event.show) this.resultOpen = false
			},
			setResultTab(tab) {
				this.resultTab = tab
				this.resultPage = 1
			},
			changeResultPage(event) {
				this.resultPage = event.current
			},
			retryFailedUsers() {
				const ids = this.failedUserIds.slice()
				this.closeBanResult()
				this.openAccountActionPreview(this.accountAction, ids)
			},
			getInviterInviteCodeIdentity(inviter) {
				const exists = Boolean(
					inviter &&
					Object.prototype.hasOwnProperty.call(inviter, 'my_invite_code') &&
					inviter.my_invite_code !== undefined
				)
				if (!exists) return { exists: false, value: undefined, label: '未设置' }
				return {
					exists: true,
					value: inviter.my_invite_code,
					label: inviter.my_invite_code === null ? '空值' : String(inviter.my_invite_code)
				}
			},
			resolveInviterBanTarget(source) {
				const inviter = source && source.inviter ? source.inviter : source
				const rawInviterId = source && source.inviterId !== undefined
					? source.inviterId
					: (inviter && inviter._id)
				const inviterId = rawInviterId === undefined || rawInviterId === null ? '' : String(rawInviterId)
				const embeddedInviterId = inviter && inviter._id !== undefined && inviter._id !== null ? String(inviter._id) : inviterId
				const inviteCodeIdentity = this.getInviterInviteCodeIdentity(inviter)
				if (!inviter || !inviterId || inviterId !== inviterId.trim() || embeddedInviterId !== inviterId) return null
				return {
					inviterId,
					inviteCodeExists: inviteCodeIdentity.exists,
					inviteCode: inviteCodeIdentity.value,
					inviteCodeLabel: inviteCodeIdentity.label,
					status: inviter.status,
					missing: Boolean(inviter.missing)
				}
			},
			async readInviterBanAccount(inviterId) {
				const response = await userCollection.where({ _id: inviterId }).field({
					_id: true,
					my_invite_code: true,
					status: true
				}).get()
				const data = response && response.result && response.result.data
				if (!Array.isArray(data) || data.length !== 1) throw new Error('邀请人账号不存在、已删除或无读取权限')
				return data[0]
			},
			async readBackInviterStatusAccount(target, actionLabel, attempts = 3) {
				let lastError = null
				for (let attempt = 0; attempt < attempts; attempt++) {
					try {
						const account = await this.readInviterBanAccount(target.inviterId)
						this.validateInviterBanAccount(account, target)
						return account
					} catch (error) {
						lastError = error
						if (attempt + 1 < attempts) {
							await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)))
						}
					}
				}
				const uncertainError = new Error(`${actionLabel}写入后连续 ${attempts} 次无法读取确认：${this.getErrorMessage(lastError)}`)
				uncertainError.inviterStatusUncertain = true
				throw uncertainError
			},
			validateInviterBanAccount(account, target) {
				if (!account || String(account._id) !== target.inviterId) throw new Error('邀请人账号身份校验失败')
				const currentInviteCode = this.getInviterInviteCodeIdentity(account)
				if (
					currentInviteCode.exists !== target.inviteCodeExists ||
					(currentInviteCode.exists && currentInviteCode.value !== target.inviteCode)
				) {
					throw new Error('邀请人邀请码已发生变化，请重新检测后再处理')
				}
			},
			applyInviterStatusToView(target, status) {
				this.updateDiscoveryInviterStatus(target.inviterId, status)
				if (this.inviter && this.inviter._id === target.inviterId) {
					this.$set(this.inviter, 'status', status)
					this.applyAccountAnalysis(Array.isArray(this.invitedUsers) ? this.invitedUsers : [])
				}
			},
			async applyInviterBanSuccess(target) {
				this.applyInviterStatusToView(target, 3)
				let autoBaseline
				try {
					autoBaseline = await this.autoBaselineBannedInviter(target.inviterId)
				} catch (baselineError) {
					console.error('邀请人已封禁，但自动写入本地基线异常:', baselineError)
					this.baselineWritable = false
					this.baselineWarning = `邀请人已封禁，但自动写入本地检测基线异常：${this.getErrorMessage(baselineError)}。请重新检测重试。`
					autoBaseline = { eligible: true, saved: false }
				}
				if (autoBaseline.eligible && autoBaseline.saved) {
					this.setTask('邀请人已封禁并自动标记为已审核；结果继续保留；受邀账号未作改动', { metricText: '已完成' })
				} else if (autoBaseline.eligible) {
					this.setTask('邀请人已封禁；自动标记已审核失败，结果仍保留为待审核；受邀账号未作改动', { metricText: '部分完成' }, true)
				} else {
					this.setTask('邀请人已封禁；原审核状态和检测结果均已保留；受邀账号未作改动', { metricText: '已完成' })
				}
			},
			applyInviterUnbanSuccess(target) {
				this.applyInviterStatusToView(target, 0)
				this.setTask('邀请人已解封；已审核状态和检测结果均继续保留；受邀账号未作改动', { metricText: '已完成' })
			},
			canOperateInviterStatus(status) {
				return isBannableStatus(status) || isUnbannableStatus(status)
			},
			getInviterStatusActionText(inviter) {
				if (!inviter || inviter.missing) return '邀请人不存在'
				if (isUnbannableStatus(inviter.status)) return '解封邀请人'
				return isBannableStatus(inviter.status) ? '封禁邀请人' : '当前状态不参与'
			},
			handleInviterStatusAction(source) {
				const target = this.resolveInviterBanTarget(source)
				if (!target) {
					uni.showToast({ title: '邀请人资料无效，请重新检测', icon: 'none' })
					return
				}
				if (isUnbannableStatus(target.status)) {
					this.confirmUnbanInviter(source)
				} else if (isBannableStatus(target.status)) {
					this.confirmBanInviter(source)
				}
			},
			confirmBanInviter(source) {
				return this.confirmInviterStatusChange(source, 'ban')
			},
			confirmUnbanInviter(source) {
				return this.confirmInviterStatusChange(source, 'unban')
			},
			confirmInviterStatusChange(source, action) {
				const target = this.resolveInviterBanTarget(source)
				if (!target) {
					uni.showToast({ title: '邀请人资料无效，请重新检测', icon: 'none' })
					return
				}
				if (this.busy || target.missing || !['ban', 'unban'].includes(action)) return
				const isBan = action === 'ban'
				const fromStatus = isBan ? 0 : 3
				const toStatus = isBan ? 3 : 0
				const actionLabel = isBan ? '封禁' : '解封'
				const sourceStatusMatches = isBan
					? isBannableStatus(target.status)
					: isUnbannableStatus(target.status)
				if (!sourceStatusMatches) {
					uni.showToast({ title: `当前账号状态不参与${actionLabel}`, icon: 'none' })
					return
				}
				uni.showModal({
					title: `确认${actionLabel}邀请人`,
					content: isBan
						? `只封禁邀请码 ${target.inviteCodeLabel} 的邀请人本人，不处理其名下任何受邀账号；成功后自动标记为已审核并继续保留检测结果。是否继续？`
						: `只解封邀请码 ${target.inviteCodeLabel} 的邀请人本人，不处理其名下任何受邀账号；检测结果和已审核状态会继续保留。是否继续？`,
					success: async result => {
						if (!result || !result.confirm || this.busy) return
						this.isBanning = true
						this.setTask(`正在${actionLabel}邀请人本人`, null)
						let writeIssued = false
						let statusConfirmed = false
						try {
							const before = await this.readInviterBanAccount(target.inviterId)
							this.validateInviterBanAccount(before, target)
							const beforeIsTarget = isBan
								? isUnbannableStatus(before.status)
								: isBannableStatus(before.status)
							if (!beforeIsTarget) {
								const beforeIsSource = isBan
									? isBannableStatus(before.status)
									: isUnbannableStatus(before.status)
								if (!beforeIsSource) throw new Error(`邀请人当前状态为${this.getStatusText(before.status)}，本功能无法安全${actionLabel}`)
								writeIssued = true
								await userCollection.where({
									_id: target.inviterId,
									my_invite_code: target.inviteCodeExists ? target.inviteCode : dbCmd.exists(false),
									status: fromStatus
								}).update({ status: toStatus })
								const after = await this.readBackInviterStatusAccount(target, actionLabel)
								const afterIsTarget = isBan
									? isUnbannableStatus(after.status)
									: isBannableStatus(after.status)
								if (!afterIsTarget) {
									const rejectedError = new Error(`账号状态${actionLabel}写入后复核未通过`)
									rejectedError.inviterStatusRejected = true
									throw rejectedError
								}
							}
							statusConfirmed = true
							if (isBan) {
								await this.applyInviterBanSuccess(target)
							} else {
								this.applyInviterUnbanSuccess(target)
							}
							uni.showToast({ title: `邀请人${actionLabel}成功`, icon: 'success' })
						} catch (error) {
							console.error(`${actionLabel}邀请人失败:`, error)
							if (statusConfirmed) {
								this.setTask(`邀请人已确认${actionLabel}，但页面结果同步失败，请重新检测刷新页面状态`, { metricText: '需刷新' }, true)
								uni.showToast({ title: `已${actionLabel}，请重新检测`, icon: 'none' })
							} else if (error.inviterStatusUncertain || (writeIssued && !error.inviterStatusRejected)) {
								const message = `${actionLabel}请求已经发送，但暂时无法确认邀请人的最终状态。请刷新或重新检测后再判断，不要立即重复操作。`
								this.setTask(message, { metricText: '结果待确认' }, true)
								uni.showModal({ title: `${actionLabel}结果待确认`, content: message, showCancel: false })
							} else {
								this.setTask(`${actionLabel}邀请人失败：${this.getErrorMessage(error)}`, { metricText: '失败' }, true)
								uni.showToast({ title: `${actionLabel}邀请人失败`, icon: 'none' })
							}
						} finally {
							this.isBanning = false
						}
					}
				})
			},
			editUser(userId) {
				if (!userId) return
				uni.navigateTo({ url: `/pages/member/users/edit?id=${encodeURIComponent(String(userId))}` })
			},
			getAccountRiskLevel(id) {
				return this.accountRiskById[id] || 'unknown'
			},
			getRiskText(level) {
				return {
					normal: '正常',
					medium: '中风险',
					high: '高风险',
					abnormal: '异常中',
					unknown: '无有效 IP'
				}[level] || '未知'
			},
			isBannedStatus(status) {
				return status !== null && status !== undefined && status !== '' && Number(status) === 3
			},
			getStatusText(status) {
				const normalized = status === null || status === undefined || status === '' ? NaN : Number(status)
				return {
					0: '正常',
					1: '禁止购买会员',
					2: '审核中',
					3: '已封禁'
				}[normalized] || '未知'
			},
			getStatusClass(status) {
				const normalized = status === null || status === undefined || status === '' ? NaN : Number(status)
				if (normalized === 3) return 'banned'
				if (normalized === 1) return 'restricted'
				if (normalized === 2) return 'reviewing'
				return 'normal'
			},
			formatTimestamp(timestamp) {
				const normalized = normalizeTimestamp(timestamp)
				if (!normalized) return '无'
				const date = new Date(normalized)
				if (Number.isNaN(date.getTime())) return '无'
				const pad = value => String(value).padStart(2, '0')
				return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
			},
			getErrorMessage(error) {
				return error && error.message ? error.message : '未知错误'
			}
		}
	}
</script>

<style lang="scss">
	.page-container {
		padding: 12px;
		color: #303133;
	}

	.page-container button {
		margin: 0;
	}

	.page-heading,
	.section-heading,
	.query-row,
	.button-row,
	.filter-row,
		.selection-summary,
		.popup-heading,
		.popup-actions,
		.ip-group-main,
	.active-ip-filter {
		display: flex;
		align-items: center;
	}

		.page-heading,
		.section-heading,
		.popup-heading,
		.ip-group-main,
	.active-ip-filter {
		justify-content: space-between;
	}

	.page-title {
		display: block;
		font-size: 20px;
		font-weight: 700;
	}

	.page-subtitle,
	.section-subtitle {
		display: block;
		margin-top: 5px;
		font-size: 13px;
		color: #909399;
	}

	.scan-read-summary {
		color: #606266;
	}

	.thresholds,
	.button-row,
	.filter-row,
	.selection-summary,
	.ip-evidence {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.threshold-label {
		font-size: 12px;
		color: #606266;
	}

	.section-heading {
		gap: 12px;
		margin-bottom: 12px;
	}

	.section-title {
		font-size: 17px;
		font-weight: 700;
	}

	.query-row {
		gap: 10px;
	}

	.query-row .uni-easyinput {
		flex: 1;
	}

	.task-panel {
		margin-top: 14px;
		padding: 10px 12px;
		border-radius: 6px;
		background: #ecf5ff;
		color: #409eff;
	}

	.task-panel.error {
		background: #fef0f0;
		color: #f56c6c;
	}

	.task-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
		gap: 8px 12px;
		justify-content: initial;
	}

	.task-message {
		min-width: 0;
		white-space: normal;
		word-break: break-word;
	}

	.task-metric {
		min-width: 48px;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		text-align: right;
	}

	.progress-track {
		height: 6px;
		margin-top: 8px;
		overflow: hidden;
		border-radius: 3px;
		background: rgba(64, 158, 255, 0.2);
	}

	.progress-value {
		height: 100%;
		background: currentColor;
		transition: width 0.2s ease;
	}

	.inviter-grid,
	.stats-grid,
	.result-summary-grid {
		display: grid;
		gap: 10px;
	}

	.inviter-grid {
		grid-template-columns: repeat(4, minmax(150px, 1fr));
	}

	.info-item {
		padding: 10px;
		border: 1px solid #ebeef5;
		border-radius: 6px;
		background: #fafafa;
	}

	.info-label,
	.info-value {
		display: block;
	}

	.info-label {
		margin-bottom: 4px;
		font-size: 12px;
		color: #909399;
	}

	.info-value {
		font-weight: 600;
	}

	.separate-warning,
	.inline-note,
	.popup-warning {
		margin-top: 10px;
		padding: 9px 12px;
		border-radius: 5px;
		background: #fdf6ec;
		color: #e6a23c;
		font-size: 13px;
	}

	.popup-warning.unban {
		border: 1px solid #91caff;
		background: #e6f4ff;
		color: #0958d9;
	}

	.load-warning {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
		padding: 12px;
		border: 1px solid #fbc4c4;
		border-radius: 6px;
		background: #fef0f0;
		color: #f56c6c;
	}

	.skipped-warning {
		display: block;
	}

	.skipped-detail-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-top: 8px;
	}

	.skipped-detail-item,
	.skipped-detail-more {
		word-break: break-all;
	}

	.data-notice {
		margin-bottom: 12px;
		padding: 10px 12px;
		border: 1px solid #b3d8ff;
		border-radius: 6px;
		background: #ecf5ff;
		color: #409eff;
	}

	.relationship-proof {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 12px;
		padding: 10px 12px;
		border: 1px solid #91caff;
		border-left-width: 4px;
		border-radius: 6px;
		background: #e6f4ff;
		color: #0958d9;
		font-size: 13px;
		line-height: 1.55;
	}

	.relationship-proof-title,
	.relationship-code {
		font-weight: 700;
	}

	.relationship-proof.invalid {
		border-color: #ff7875;
		background: #fff2f0;
		color: #cf1322;
	}

	.relationship-invalid-text {
		color: #cf1322;
		font-weight: 700;
	}

	.inline-note.danger {
		background: #fef0f0;
		color: #f56c6c;
	}

	.stats-grid {
		grid-template-columns: repeat(4, minmax(120px, 1fr));
	}

	.stat-card,
	.result-count {
		padding: 14px;
		border: 1px solid #ebeef5;
		border-radius: 7px;
		text-align: center;
	}

	.stat-number,
	.stat-label,
	.result-count text {
		display: block;
	}

	.stat-number,
	.result-count text:first-child {
		font-size: 24px;
		font-weight: 700;
	}

	.stat-label,
	.result-count text:last-child {
		margin-top: 4px;
		font-size: 12px;
		color: #909399;
	}

	.stat-card.high,
	.result-count.failed {
		background: #fef0f0;
		color: #f56c6c;
	}

	.stat-card.medium,
	.result-count.skipped {
		background: #fdf6ec;
		color: #e6a23c;
	}

	.stat-card.normal,
	.result-count.success {
		background: #f0f9eb;
		color: #67c23a;
	}

	.stat-card.unknown {
		background: #f4f4f5;
		color: #909399;
	}

	.ip-groups-section,
	.account-filters {
		margin-top: 14px;
	}

	.filter-label {
		font-size: 13px;
		color: #606266;
	}

	.filter-row button.active {
		border-color: #409eff;
		background: #ecf5ff;
		color: #409eff;
	}

	.ip-group-card {
		margin-top: 10px;
		padding: 12px;
		border: 1px solid #dcdfe6;
		border-left-width: 4px;
		border-radius: 6px;
	}

	.ip-group-card.high {
		border-color: #f56c6c;
		border-left-color: #f56c6c;
		background: #fff2f0;
	}

	.ip-group-card.medium {
		border-color: #e6a23c;
		border-left-color: #e6a23c;
		background: #fffbe6;
	}

	.ip-group-card.normal { border-left-color: #67c23a; }

	.ip-address {
		margin-right: 8px;
		font-family: Consolas, Monaco, monospace;
		font-weight: 700;
	}

	.ip-total {
		font-weight: 600;
	}

	.ip-evidence {
		margin: 8px 0;
		font-size: 12px;
		color: #909399;
	}

	.button-row.compact {
		justify-content: flex-end;
	}

	.risk-pill {
		display: inline-block;
		padding: 2px 7px;
		border-radius: 10px;
		font-size: 12px;
		white-space: nowrap;
	}

	.risk-pill.high { background: #fef0f0; color: #f56c6c; }
	.risk-pill.abnormal { background: #fff0f6; color: #c41d7f; }
	.risk-pill.medium { background: #fdf6ec; color: #e6a23c; }
	.risk-pill.normal { background: #f0f9eb; color: #67c23a; }
	.risk-pill.unknown { background: #f4f4f5; color: #909399; }

	.status-text.banned { color: #f56c6c; font-weight: 700; }
	.status-text.restricted { color: #e6a23c; }
	.status-text.reviewing { color: #409eff; }
	.status-text.normal { color: #67c23a; }

	.account-heading {
		align-items: flex-start;
	}

	.keyword-filter {
		max-width: 430px;
		margin-top: 10px;
	}

	.active-ip-filter {
		margin-top: 10px;
		padding: 8px 10px;
		border-radius: 5px;
		background: #ecf5ff;
		color: #409eff;
	}

	.pagination-row {
		display: flex;
		justify-content: flex-end;
		margin-top: 14px;
	}

	.empty-state {
		padding: 24px;
		text-align: center;
		color: #909399;
	}

	.empty-state.standalone {
		border: 1px dashed #dcdfe6;
		border-radius: 6px;
	}

	.empty-state.table-empty {
		margin: 8px 0;
		border: 1px dashed #dcdfe6;
		border-radius: 6px;
	}

	.filtered-empty-state text {
		display: block;
	}

	.filtered-empty-state button {
		width: fit-content;
		margin: 10px auto 0;
	}

	.mono {
		font-family: Consolas, Monaco, monospace;
	}

	.mono.small {
		font-size: 12px;
		word-break: break-all;
	}

	.popup-card {
		width: 86vw;
		max-width: 760px;
		max-height: 86vh;
		padding: 18px;
		box-sizing: border-box;
		overflow-y: auto;
		border-radius: 8px;
		background: #fff;
	}

	.popup-title {
		font-size: 18px;
		font-weight: 700;
	}

	.popup-close {
		padding: 0 6px;
		font-size: 24px;
		cursor: pointer;
	}

	.popup-summary {
		margin: 12px 0 8px;
		font-weight: 700;
	}

	.popup-list {
		height: 32vh;
		min-height: 120px;
		max-height: 360px;
		border: 1px solid #ebeef5;
		border-radius: 6px;
	}

	.popup-list-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 9px 12px;
		border-bottom: 1px solid #ebeef5;
	}

	.popup-id {
		display: block;
		margin-top: 3px;
		font-family: Consolas, Monaco, monospace;
		font-size: 11px;
		color: #909399;
	}

	.restore-target {
		display: block;
		margin-top: 4px;
		font-size: 12px;
		font-weight: 600;
		color: #0958d9;
	}

	.preview-ips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
		margin-top: 4px;
		font-family: Consolas, Monaco, monospace;
		font-size: 11px;
		color: #606266;
	}

	.popup-actions {
		justify-content: flex-end;
		gap: 10px;
		margin-top: 14px;
	}

	.result-summary-grid {
		grid-template-columns: repeat(3, 1fr);
		margin: 12px 0;
	}

	.result-tabs {
		margin-bottom: 8px;
	}

	.result-reason {
		max-width: 45%;
		font-size: 12px;
		color: #606266;
		text-align: right;
	}

	.scope-tabs,
	.scan-actions,
	.row-actions,
	.change-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.scope-tabs button.active,
	.date-mode-options button.active,
	.result-filter-panel button.active {
		border-color: #409eff;
		background: #ecf5ff;
		color: #409eff;
	}

	.scope-condition {
		margin-top: 12px;
	}

	.date-mode-heading,
	.date-mode-options,
	.custom-days-row,
	.manual-date-row {
		display: flex;
		align-items: center;
	}

	.date-mode-heading {
		justify-content: space-between;
		gap: 8px 16px;
	}

	.business-today,
	.date-help {
		font-size: 12px;
		color: #909399;
	}

	.business-today {
		white-space: nowrap;
	}

	.date-mode-options {
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 8px;
	}

	.custom-days-row,
	.manual-date-row {
		gap: 10px;
		margin-top: 10px;
	}

	.custom-days-row .uni-easyinput {
		flex: 0 1 180px;
		max-width: 180px;
	}

	.manual-date-row {
		align-items: flex-start;
		flex-direction: column;
	}

	.date-help {
		display: block;
		line-height: 1.6;
	}

	.scope-all-tip {
		padding: 10px 12px;
		border: 1px solid #d9ecff;
		border-radius: 6px;
		background: #ecf5ff;
		color: #409eff;
	}

	.scan-actions {
		justify-content: flex-end;
		margin-top: 14px;
	}

	.scan-actions button {
		min-width: 0;
	}

	.discovery-stats {
		grid-template-columns: repeat(6, minmax(100px, 1fr));
	}

	.stat-card.abnormal {
		background: #fff0f6;
		color: #c41d7f;
	}

	.stat-card.pending {
		background: #f9f0ff;
		color: #722ed1;
	}

	.discovery-alert {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 18px;
		margin-top: 12px;
		padding: 12px 14px;
		border: 1px solid #ffccc7;
		border-radius: 6px;
		background: #fff2f0;
		color: #cf1322;
	}

	.discovery-alert.first {
		border-color: #ffe58f;
		background: #fffbe6;
		color: #ad6800;
	}

	.discovery-alert-title {
		font-weight: 700;
	}

	.ip-risk-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 10px 18px;
		margin-top: 12px;
		padding: 12px 14px;
		border: 1px solid #e6a23c;
		border-radius: 6px;
		background: #fffbe6;
		color: #ad6800;
	}

	.ip-risk-banner.high {
		border-color: #f56c6c;
		background: #fff2f0;
		color: #cf1322;
	}

	.ip-risk-banner-copy,
	.ip-risk-banner-title,
	.ip-risk-banner-detail {
		display: block;
	}

	.ip-risk-banner-copy {
		flex: 1 1 360px;
		min-width: 0;
	}

	.ip-risk-banner-title {
		font-weight: 700;
	}

	.ip-risk-banner-detail {
		margin-top: 4px;
		font-size: 13px;
		line-height: 1.6;
	}

	.ip-risk-banner-hint {
		flex: 0 1 360px;
		font-size: 12px;
		line-height: 1.6;
	}

	.detail-ip-risk-banner {
		margin-bottom: 12px;
	}

	.ip-risk-banner-actions {
		flex: 0 0 auto;
		margin-top: 0;
	}

	.invitee-count {
		font-weight: 700;
		white-space: nowrap;
	}

	.ip-risk-cell {
		display: inline-flex;
		align-items: center;
		flex-direction: column;
		gap: 3px;
		min-width: 132px;
		padding: 7px 8px;
		box-sizing: border-box;
		border: 1px solid #dcdfe6;
		border-radius: 6px;
		background: #f4f4f5;
	}

	.ip-risk-cell.high {
		border-color: #f56c6c;
		background: #fff2f0;
		color: #cf1322;
	}

	.ip-risk-cell.medium {
		border-color: #e6a23c;
		background: #fffbe6;
		color: #ad6800;
	}

	.ip-risk-cell.normal {
		border-color: #67c23a;
		background: #f0f9eb;
		color: #389e0d;
	}

	.ip-risk-cell-main {
		font-size: 14px;
		font-weight: 700;
	}

	.ip-risk-cell-line {
		font-size: 11px;
		line-height: 1.4;
	}

	.ip-risk-cell-line.high {
		color: #cf1322;
		font-weight: 700;
	}

	.ip-risk-cell-line.medium {
		color: #ad6800;
		font-weight: 600;
	}

	.ip-risk-cell-line.normal {
		color: #67c23a;
	}

	.result-filter-panel {
		display: grid;
		gap: 10px;
		margin: 14px 0;
		padding: 12px;
		border: 1px solid #ebeef5;
		border-radius: 6px;
		background: #fafafa;
	}

	.change-badges {
		justify-content: center;
		gap: 4px;
	}

	.change-badge,
	.reviewed-badge {
		display: inline-block;
		padding: 2px 6px;
		border-radius: 10px;
		font-size: 11px;
	}

	.change-badge {
		background: #fff1f0;
		color: #cf1322;
	}

	.reviewed-badge {
		background: #f0f9eb;
		color: #67c23a;
	}

	.new-result-row {
		background: #fffdf6;
	}

	.row-actions {
		justify-content: center;
	}

	.inviter-primary-cell {
		display: flex;
		align-items: center;
		flex-direction: column;
		gap: 6px;
	}

	.mobile-inviter-action {
		display: none;
		min-width: 0;
		margin: 0;
	}

	.cell-subline,
	.reason-line {
		display: block;
		margin-top: 3px;
	}

	.reason-line {
		font-size: 12px;
		color: #606266;
	}

	.inviter-detail-anchor {
		height: 1px;
	}

	.inviter-detail-feedback-anchor {
		scroll-margin-top: 12px;
	}

	.detail-load-feedback {
		display: flex;
		align-items: center;
		gap: 14px;
		min-height: 72px;
		padding: 12px;
		border: 1px solid #b3d8ff;
		border-radius: 6px;
		background: #ecf5ff;
		color: #303133;
	}

	.detail-load-feedback.error {
		border-color: #fbc4c4;
		background: #fef0f0;
	}

	.detail-load-spinner {
		flex: 0 0 24px;
		width: 24px;
		height: 24px;
		border: 3px solid #c6e2ff;
		border-top-color: #409eff;
		border-radius: 50%;
		animation: detail-loading-spin 0.8s linear infinite;
	}

	.detail-load-copy {
		display: flex;
		flex: 1 1 auto;
		min-width: 0;
		flex-direction: column;
		gap: 4px;
	}

	.detail-load-title {
		font-weight: 700;
	}

	.detail-load-target,
	.detail-load-progress {
		font-size: 12px;
		line-height: 1.6;
		word-break: break-all;
	}

	.detail-load-actions {
		flex: 0 0 auto;
		margin-top: 0;
	}

	@keyframes detail-loading-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media screen and (max-width: 900px) {
		.detail-load-feedback {
			align-items: flex-start;
			flex-wrap: wrap;
		}

		.detail-load-actions {
			width: 100%;
		}

		.mobile-inviter-action {
			display: inline-flex;
		}

		.page-heading,
		.section-heading,
		.query-row,
		.load-warning {
			align-items: stretch;
			flex-direction: column;
		}

		.inviter-grid,
		.stats-grid {
			grid-template-columns: repeat(2, minmax(120px, 1fr));
		}

		.discovery-stats {
			grid-template-columns: repeat(2, minmax(110px, 1fr));
		}

		.thresholds,
		.button-row,
		.selection-summary {
			margin-top: 8px;
		}

		.ip-risk-banner-actions {
			margin-top: 0;
		}

		.popup-card {
			width: 94vw;
		}
	}

	@media screen and (max-width: 480px) {
		.task-row {
			grid-template-columns: minmax(0, 1fr);
			gap: 6px 8px;
		}

		.task-metric {
			min-width: 40px;
			white-space: normal;
			text-align: left;
		}

		.date-mode-heading,
		.custom-days-row {
			align-items: stretch;
			flex-direction: column;
		}

		.business-today {
			white-space: normal;
		}

		.custom-days-row .uni-easyinput {
			flex-basis: auto;
			max-width: none;
		}

		.ip-risk-banner {
			align-items: stretch;
			flex-direction: column;
		}

		.ip-risk-banner-copy,
		.ip-risk-banner-hint {
			flex-basis: auto;
		}
	}
</style>
