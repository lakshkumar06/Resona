pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

template Multiplier2(n) {
    // Inputs
    signal input a[n];
    signal input b[n];

    signal thresholdSquared;
    thresholdSquared <== 5625; // 0.75² * 10000

    // Loop to compute dot product and magnitudes
    signal aTimesB[n];
    signal aSq[n];
    signal bSq[n];

    for (var i = 0; i < n; i++) {
        aTimesB[i] <== a[i] * b[i];
        aSq[i] <== a[i] * a[i];
        bSq[i] <== b[i] * b[i];
    }

    // Accumulators for sums
    signal dotProdAcc[n+1];
    signal magAAcc[n+1];
    signal magBAcc[n+1];

    dotProdAcc[0] <== 0;
    magAAcc[0] <== 0;
    magBAcc[0] <== 0;

    for (var i = 0; i < n; i++) {
        dotProdAcc[i+1] <== dotProdAcc[i] + aTimesB[i];
        magAAcc[i+1] <== magAAcc[i] + aSq[i];
        magBAcc[i+1] <== magBAcc[i] + bSq[i];
    }

    signal dotProd;
    dotProd <== dotProdAcc[n];
    signal magA;
    magA <== magAAcc[n];
    signal magB;
    magB <== magBAcc[n];

    // Compute dot^2 and threshold * magA * magB
    signal dotProdSquared;
    dotProdSquared <== dotProd * dotProd * 10000; // scale to match threshold²

    signal rhs;
    signal temp;
    temp <== magA * magB;
    rhs <== thresholdSquared * temp;

    // Assert (a · b)² ≥ threshold² * ||a||² * ||b||²
    // i.e., dotProdSquared >= rhs
    component check = LessThan(252);
    check.in[0] <== rhs;
    check.in[1] <== dotProdSquared;
    check.out === 0;

    // Optional output
    signal output dot;
    dot <== dotProd;
    signal output magnitudeA;
    magnitudeA <== magA;
    signal output magnitudeB;
    magnitudeB <== magB;
    signal output passed;
    passed <== 1;

    signal output debug_dotProdSquared;
    debug_dotProdSquared <== dotProdSquared;
    signal output debug_rhs;
    debug_rhs <== rhs;
}



component main = Multiplier2(192);
