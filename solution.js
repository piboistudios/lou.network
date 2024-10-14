function solution(N, K) {
    // Implement your solution here
    if (K <= N) return 1;
    let i = 0;
    while (N) {
        if (K > 0) {
            console.log({N,K,i})
            K -= N;
            N--;
            i++;
        } else {
            console.log('early termination', {N,K,i})
            return i;
        }
    }
    console.log('not found', {N,K,i})
    return K > 0 ? -1 : i;

}