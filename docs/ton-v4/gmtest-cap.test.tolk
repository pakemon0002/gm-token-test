// GMTEST has no monetary value. Tests run in the offline TON TVM emulator only.
// 150,000,000 GMTEST * 10^9 raw units: maximum outstanding supply.
import "@acton/build"
import "@acton/emulation/network"
import "@acton/emulation/testing"
import "@acton/testing/expect"
import "@acton/types/transaction"
import "@contracts/errors"
import "@contracts/messages"
import "@contracts/storage"
import "@wrappers/JettonMinter.gen"
import "@wrappers/JettonWallet.gen"
import "@wrappers/utils"
import "test-utils"

const GMTEST_CAP = 150000000000000000

get fun `test GMTEST cap: exactly 150m can be minted by admin`() {
    val (minter, deployer, _) = setupTest();
    val res = minter.sendMint(deployer.address, deployer.address, GMTEST_CAP, grams("0.05"), grams("0.3"));
    expect(res).toHaveSuccessfulTx<MintNewJettons>({
        from: deployer.address,
        to: minter.address,
    });
    expect(minter.getTotalSupply()).toEqual(GMTEST_CAP);
    val wallet = userWallet(minter, deployer.address);
    expect(wallet.getJettonBalance()).toEqual(GMTEST_CAP);
}

get fun `test GMTEST cap: more than 150m rejected without supply change`() {
    val (minter, deployer, _) = setupTest();
    val res = minter.sendMint(deployer.address, deployer.address, GMTEST_CAP + 1, grams("0.05"), grams("0.3"));
    expect(res).toHaveFailedTx<MintNewJettons>({
        from: deployer.address,
        to: minter.address,
        exitCode: Errors.MintCapExceeded,
    });
    expect(minter.getTotalSupply()).toEqual(0);
}

get fun `test GMTEST cap: cumulative mint cannot exceed cap`() {
    val (minter, deployer, _) = setupTest();
    val first = minter.sendMint(deployer.address, deployer.address, GMTEST_CAP - 1, grams("0.05"), grams("0.3"));
    expect(first).toHaveSuccessfulTx<MintNewJettons>({
        from: deployer.address,
        to: minter.address,
    });
    val rejected = minter.sendMint(deployer.address, deployer.address, 2, grams("0.05"), grams("0.3"));
    expect(rejected).toHaveFailedTx<MintNewJettons>({
        from: deployer.address,
        to: minter.address,
        exitCode: Errors.MintCapExceeded,
    });
    expect(minter.getTotalSupply()).toEqual(GMTEST_CAP - 1);
    val final = minter.sendMint(deployer.address, deployer.address, 1, grams("0.05"), grams("0.3"));
    expect(final).toHaveSuccessfulTx<MintNewJettons>({
        from: deployer.address,
        to: minter.address,
    });
    expect(minter.getTotalSupply()).toEqual(GMTEST_CAP);
}

get fun `test GMTEST cap: reject mint of zero raw units`() {
    val (minter, deployer, _) = setupTest();
    val res = minter.sendMint(deployer.address, deployer.address, 0, grams("0.05"), grams("0.3"));
    expect(res).toHaveFailedTx<MintNewJettons>({
        from: deployer.address,
        to: minter.address,
        exitCode: Errors.MintCapExceeded,
    });
    expect(minter.getTotalSupply()).toEqual(0);
}

get fun `test GMTEST cap: admin cannot replace code and data to bypass cap`() {
    val (minter, deployer, _) = setupTest();
    val fakeData = MinterStorage {
        totalSupply: GMTEST_CAP + 1000,
        adminAddress: deployer.address,
        nextAdminAddress: null,
        metadata: buildTestMetadata("bypass"),
    }.toCell();
    val res = minter.sendUpgradeMinterCode(
        deployer.address, 0, fakeData, build("JettonMinter"),
        { bounce: false, value: grams("0.2") },
    );
    expect(res).toHaveFailedTx<UpgradeMinterCode>({
        from: deployer.address,
        to: minter.address,
        exitCode: Errors.UpgradeDisabled,
    });
    expect(minter.getTotalSupply()).toEqual(0);
}

get fun `test GMTEST immutable supply: full mint then revoke admin, burn cannot reopen mint`() {
    val (minter, deployer, _) = setupTest();
    val wallet = mintTo(minter, deployer, deployer.address, GMTEST_CAP);
    expect(minter.getTotalSupply()).toEqual(GMTEST_CAP);
    expect(wallet.getJettonBalance()).toEqual(GMTEST_CAP);

    val revoke = minter.sendDropMinterAdmin(
        deployer.address,
        0,
        { bounce: false, value: grams("0.05") },
    );
    expect(revoke).toHaveSuccessfulTx<DropMinterAdmin>({
        from: deployer.address,
        to: minter.address,
    });
    expect(minter.getAdminAddress()).toEqual(null);

    val amountToBurn = grams("1");
    val burn = wallet.sendAskToBurn(
        deployer.address,
        0,
        amountToBurn,
        deployer.address,
        null,
        { bounce: false, value: DEFAULT_BURN_MSG_VALUE },
    );
    expect(burn).toHaveSuccessfulTx<AskToBurn>({
        from: deployer.address,
        to: wallet.address,
    });
    expect(minter.getTotalSupply()).toEqual(GMTEST_CAP - amountToBurn);

    // The available circulating headroom is NOT a license to mint again.
    val blocked = minter.sendMint(
        deployer.address,
        deployer.address,
        amountToBurn,
        grams("0.05"),
        grams("0.3"),
    );
    expect(blocked).toHaveFailedTx<MintNewJettons>({
        from: deployer.address,
        to: minter.address,
        exitCode: 7,
    });
    expect(minter.getTotalSupply()).toEqual(GMTEST_CAP - amountToBurn);
    expect(wallet.getJettonBalance()).toEqual(GMTEST_CAP - amountToBurn);
}

get fun `test GMTEST immutable admin: pending successor cannot claim after authority revoked`() {
    val (minter, deployer, notDeployer) = setupTest();
    val pending = minter.sendChangeMinterAdmin(
        deployer.address,
        0,
        notDeployer.address,
        { bounce: false, value: grams("0.05") },
    );
    expect(pending).toHaveSuccessfulTx<ChangeMinterAdmin>({
        from: deployer.address,
        to: minter.address,
    });
    expect(minter.getAdminAddress()).toEqual(deployer.address);
    val revoke = minter.sendDropMinterAdmin(
        deployer.address,
        0,
        { bounce: false, value: grams("0.05") },
    );
    expect(revoke).toHaveSuccessfulTx<DropMinterAdmin>({
        from: deployer.address,
        to: minter.address,
    });
    expect(minter.getAdminAddress()).toEqual(null);
    val claim = minter.sendClaimMinterAdmin(
        notDeployer.address,
        0,
        { bounce: false, value: grams("0.05") },
    );
    expect(claim).toHaveFailedTx<ClaimMinterAdmin>({
        from: notDeployer.address,
        to: minter.address,
        exitCode: 7,
    });
    expect(minter.getAdminAddress()).toEqual(null);
    val regain = minter.sendChangeMinterAdmin(
        deployer.address,
        0,
        deployer.address,
        { bounce: false, value: grams("0.05") },
    );
    expect(regain).toHaveFailedTx<ChangeMinterAdmin>({
        from: deployer.address,
        to: minter.address,
        exitCode: 7,
    });
    expect(minter.getAdminAddress()).toEqual(null);
}

get fun `test GMTEST cap: dropped admin cannot mint`() {
    val (minter, deployer, _) = setupTest();
    val dropped = minter.sendDropMinterAdmin(
        deployer.address, 0, { bounce: false, value: grams("0.05") },
    );
    expect(dropped).toHaveSuccessfulTx<DropMinterAdmin>({
        from: deployer.address,
        to: minter.address,
    });
    expect(minter.getAdminAddress()).toEqual(null);
    val res = minter.sendMint(deployer.address, deployer.address, 1000, grams("0.05"), grams("0.3"));
    expect(res).toHaveFailedTx<MintNewJettons>({
        from: deployer.address,
        to: minter.address,
        exitCode: 7,
    });
    expect(minter.getTotalSupply()).toEqual(0);
}
