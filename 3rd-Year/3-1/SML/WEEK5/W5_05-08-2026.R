# WEEK5:
## 5.1 t test
### i. t-test for single mean [Student t-test]
## Example 1:
A=c(13.1, 14.5, 12.1, 11.9, 12.4, 12.3, 11.5, 11.6, 12.1, 12.4)
t.test(A,mu=12.35,alternative="two.sided",conf.level = 0.99)

## Example 2:
X=c(10.2, 9.7, 10.1, 10.3, 10.1, 9.8, 9.9, 10.4, 10.3, 9.8)
t.test(X,mu=10,alternative="two.sided")
