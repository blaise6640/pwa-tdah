



git add .
git commit -m "PWA-TDAH  "
git tag PWA-TDAH-0.0.1
git push -u origin PWA-TDAH
git push origin PWA-TDAH-0.0.1


# Mode normal
./commit_dans_github.sh
ou alias commit

# Mode test (simulation sans exécution)
./commit_dans_github.sh -test
ou alias commit-test