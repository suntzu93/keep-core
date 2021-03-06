
const {contract, web3} = require("@openzeppelin/test-environment")
const {time} = require("@openzeppelin/test-helpers")
const {createSnapshot, restoreSnapshot} = require('../helpers/snapshot');
const {initTokenStaking} = require('../helpers/initContracts')

const BN = web3.utils.BN
const chai = require('chai')
chai.use(require('bn-chai')(BN))
const expect = chai.expect

const KeepToken = contract.fromArtifact('KeepToken');
const TokenGrant = contract.fromArtifact('TokenGrant');
const KeepRegistry = contract.fromArtifact("KeepRegistry");

describe('TokenStaking/MinimumStake', function() {
  let token, registry, stakingContract, keepDecimals;
  const initializationPeriod = time.duration.seconds(10);

  const schedule = web3.utils.toBN(86400 * 365 * 2)
  const steps = web3.utils.toBN(10)
  const stepDuration = schedule.div(steps) // 2 years / 10 intervals

  before(async () => {
    token = await KeepToken.new();
    grant = await TokenGrant.new(token.address);
    registry = await KeepRegistry.new();
    const stakingContracts = await initTokenStaking(
      token.address,
      grant.address,
      registry.address,
      initializationPeriod,
      contract.fromArtifact('TokenStakingEscrow'),
      contract.fromArtifact('TokenStaking')
    )
    stakingContract = stakingContracts.tokenStaking;

    keepDecimals = web3.utils.toBN(10).pow(web3.utils.toBN(18));
  });

  beforeEach(async () => {
    await createSnapshot()
  })

  afterEach(async () => {
    await restoreSnapshot()
  })

  describe("minimumStake", async () => {
    it("returns max value when the schedule starts", async () => {
      expect(await stakingContract.minimumStake()).to.eq.BN(
        web3.utils.toBN(100000).mul(keepDecimals),
        "Unexpected minimum stake amount"
      );
    })

    it("returns max value right before the next schedule step", async () => {
      let minimumStakeScheduleStart = await stakingContract.minimumStakeScheduleStart();
      let timeForStepOne = minimumStakeScheduleStart.add(stepDuration)
      // Rounding timestamp jump to 1 minute less (looks like increaseTime() can occasionally add extra seconds)
      await time.increase(timeForStepOne.sub(await time.latest()).sub(time.duration.minutes(1)))
      expect(await stakingContract.minimumStake()).to.eq.BN(
        web3.utils.toBN(100000).mul(keepDecimals),
        "Unexpected minimum stake amount"
      );
    })

    it("returns correct value right after the first schedule step", async () => {
      let minimumStakeScheduleStart = await stakingContract.minimumStakeScheduleStart();
      let timeForStepOne = minimumStakeScheduleStart.add(stepDuration)
      await time.increase(timeForStepOne.sub(await time.latest()))
      expect(await stakingContract.minimumStake()).to.eq.BN(
        web3.utils.toBN(90000).mul(keepDecimals),
        "Unexpected minimum stake amount"
      );
    })

    it("returns half value in the middle of the schedule", async () => {
      await time.increase(schedule.divn(2).toNumber());
      expect(await stakingContract.minimumStake()).to.eq.BN(
        web3.utils.toBN(50000).mul(keepDecimals),
        "Unexpected minimum stake amount"
      );
    })

    it("returns min value when the schedule ends", async () => {
      await time.increase(schedule.toNumber());
      expect(await stakingContract.minimumStake()).to.eq.BN(
        web3.utils.toBN(10000).mul(keepDecimals),
        "Unexpected minimum stake amount"
      );
    })
  })
});
