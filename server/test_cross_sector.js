const {
  runRedistributionScan,
  getSuggestions,
  getCrossSectorAnalysis,
  simulateSummerShortage,
  resetSimulation,
  updateSuggestionStatus,
  authorizeTransfer,
  completeTransfer,
  getAuthorizedTransfers,
  getActiveStock,
} = require('./services/redistributionEngine')

async function runTests() {
  console.log('🧪 Starting Cross-Sector Blood Bridge Tests...\n')

  // 1. Initial baseline test
  await runRedistributionScan()
  let analysis = getCrossSectorAnalysis()
  console.log('1️⃣ Initial Baseline State:')
  console.log(`   - Government Avg Fullness: ${analysis.governmentStockFullnessAvg}%`)
  console.log(`   - Private Avg Fullness: ${analysis.privateStockFullnessAvg}%`)
  console.log(`   - Gap: ${analysis.gapPercentage}%`)
  console.log(`   - Is Imbalanced: ${analysis.isImbalanced}`)
  console.log(`   - Citation Note Present: ${Boolean(analysis.citationNote)}`)

  if (analysis.isImbalanced) {
    console.error('❌ Baseline should not have an active imbalance alert by default.')
    process.exit(1)
  }
  console.log('   ✅ Baseline verified correctly!\n')

  // 2. Trigger Summer Shortage Simulation
  console.log('2️⃣ Activating Seasonal Crisis Simulation (Nagpur May 2026 Summer Pattern)...')
  const simResult = await simulateSummerShortage()
  analysis = getCrossSectorAnalysis()
  const suggestions = getSuggestions()
  const crossSectorSugg = suggestions.filter(s => s.cross_sector)

  console.log(`   - Simulation Active: ${analysis.summerSimulationActive}`)
  console.log(`   - Government Avg Fullness: ${analysis.governmentStockFullnessAvg}% (Expected: 70-90%)`)
  console.log(`   - Private Avg Fullness: ${analysis.privateStockFullnessAvg}% (Expected: 10-25%)`)
  console.log(`   - Gap: ${analysis.gapPercentage}% (Expected: >= 25%)`)
  console.log(`   - Is Imbalanced: ${analysis.isImbalanced}`)
  console.log(`   - Alert Message: "${analysis.alertMessage}"`)
  console.log(`   - Total Cross-Sector Opportunities: ${crossSectorSugg.length}`)

  if (!analysis.isImbalanced || analysis.gapPercentage < 25) {
    console.error('❌ Simulation did not trigger the required >=25% sector imbalance.')
    process.exit(1)
  }

  if (crossSectorSugg.length === 0) {
    console.error('❌ No cross-sector suggestions generated under summer shortage.')
    process.exit(1)
  }

  console.log('   Sample Cross-Sector Transfers Generated:')
  crossSectorSugg.slice(0, 3).forEach(s => {
    console.log(`     * [${s.id}] ${s.sourceBankName} (${s.sourceBankType}) ➔ ${s.targetBankName} (${s.targetBankType}) | ${s.unitsSuggested}u ${s.bloodGroup} | ${s.distanceKm}km`)
  })
  console.log('   ✅ Summer Shortage Simulation verified successfully!\n')

  // 3. Test Transfer Authorization Workflow (Review, Adjust Quantity, Choose Drone Dispatch)
  const targetSugg = crossSectorSugg[0]
  console.log(`3️⃣ Authorizing Transfer for ${targetSugg.sourceBankName} ➔ ${targetSugg.targetBankName}...`)
  const srcStockBefore = getActiveStock()[targetSugg.sourceBankId]?.[targetSugg.bloodGroup] || 16
  const tgtStockBefore = getActiveStock()[targetSugg.targetBankId]?.[targetSugg.bloodGroup] || 2
  const transferUnits = 3 // Adjusted custom quantity

  const authTransfer = await authorizeTransfer({
    suggestionId: targetSugg.id,
    sourceBankId: targetSugg.sourceBankId,
    sourceBankName: targetSugg.sourceBankName,
    sourceBankType: targetSugg.sourceBankType,
    targetBankId: targetSugg.targetBankId,
    targetBankName: targetSugg.targetBankName,
    targetBankType: targetSugg.targetBankType,
    bloodGroup: targetSugg.bloodGroup,
    units: transferUnits,
    transportMethod: 'drone',
    authorizedBy: 'Dr. S. Sharma (Nagpur Regional Blood Director)',
    distanceKm: targetSugg.distanceKm,
    notes: 'Urgent summer shortage replenishment via autonomous drone corridor',
  })

  console.log(`   - Generated Transfer ID: ${authTransfer.id}`)
  console.log(`   - Transport Mode: ${authTransfer.transportMethod.toUpperCase()} (~${authTransfer.etaMins} mins ETA)`)
  console.log(`   - Status: ${authTransfer.status}`)
  
  const srcStockAfter = getActiveStock()[targetSugg.sourceBankId]?.[targetSugg.bloodGroup]
  console.log(`   - Source Stock Deducted: ${srcStockBefore}u ➔ ${srcStockAfter}u (-${transferUnits}u)`)

  if (!authTransfer.id.startsWith('XFER-NGP-') || authTransfer.status !== 'in_transit') {
    console.error('❌ Transfer authorization failed.')
    process.exit(1)
  }
  console.log('   ✅ Transfer authorization & inventory deduction verified!\n')

  // 4. Test Handover Delivery Completion
  console.log(`4️⃣ Finalizing Handover & Receiving Units at Destination Bank...`)
  const completedTransfer = await completeTransfer(authTransfer.id)
  const tgtStockAfter = getActiveStock()[targetSugg.targetBankId]?.[targetSugg.bloodGroup]
  console.log(`   - Transfer Status: ${completedTransfer.status}`)
  console.log(`   - Destination Stock Replenished: ${tgtStockBefore}u ➔ ${tgtStockAfter}u (+${transferUnits}u)`)

  if (completedTransfer.status !== 'completed' || tgtStockAfter !== tgtStockBefore + transferUnits) {
    console.error('❌ Transfer completion failed to update target stock.')
    process.exit(1)
  }
  console.log('   ✅ Handover completion & target stock replenishment verified!\n')

  // 5. Verify Active Transfers Registry
  const allTransfers = getAuthorizedTransfers()
  console.log(`5️⃣ Verifying Active Sector Transfers Registry (${allTransfers.length} total records)...`)
  console.log(`   - Latest Record: [${allTransfers[0].id}] ${allTransfers[0].bloodGroup} (${allTransfers[0].units}u) | Status: ${allTransfers[0].status}`)
  console.log('   ✅ Sector transfers registry verified!\n')

  // 6. Reset Simulation
  console.log('6️⃣ Resetting Simulation to Normal Baseline...')
  await resetSimulation()
  analysis = getCrossSectorAnalysis()
  console.log(`   - Simulation Active: ${analysis.summerSimulationActive}`)
  console.log(`   - Government Avg Fullness: ${analysis.governmentStockFullnessAvg}%`)
  console.log(`   - Private Avg Fullness: ${analysis.privateStockFullnessAvg}%`)
  console.log(`   - Gap: ${analysis.gapPercentage}%`)
  console.log(`   - Is Imbalanced: ${analysis.isImbalanced}`)

  if (analysis.summerSimulationActive || analysis.isImbalanced) {
    console.error('❌ Reset did not restore normal operational baseline.')
    process.exit(1)
  }
  console.log('   ✅ Reset to Normal successfully verified!\n')

  console.log('🎉 ALL CROSS-SECTOR BLOOD BRIDGE & AUTHORIZATION TESTS PASSED!')
}

runTests().catch(err => {
  console.error('Test execution error:', err)
  process.exit(1)
})

