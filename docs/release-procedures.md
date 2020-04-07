# Release procedures

This document describes versioning methodology for `QTopology` project.

## Semantic versioning

We use [semantic versioning](https://docs.npmjs.com/getting-started/semantic-versioning), thus supporting easier `npm` dependency tracking and auto-upgrading.

## Git organization

Code is being accumulated in Github on `master` branch. Developers should fork the repository and develop in their forks. When change is ready to be included into `master`, a pull-request should be created and reviewed.

Github also contains two additional branches, used for versioning and patching:

- `release` branch - from here the official version are created.
- `frozen` branch - "code-freeze" branch, used also for creating patches.

## Github steps for new release

These steps must be taken for **major or minor version**. When code is not under heavy concurrent development, these steps can **also** be taken for **patch version**.

1. Commit and merge all relevant code into `master` branch on Github.
1. Increase version number, either manually or using `npm version` command. This must also be done on `master` branch.
1. Merge `master` branch into `frozen` branch
1. Merge `frozen` branch into `release` branch
1. Enter new release into Github - using the version number created in the first step. Tag name should be `vX.Y.Z` and release name should be `X.Y.Z`.
1. Publish new code to npm using `npm publish` command.

## Github steps for new patch

These steps are **recommended for patching current version** when master code already heavily changed, possibly with breaking or non-tested changes.

1. Open `frozen` branch
1. Included the patched code to this branch
1. Increase version number, either manually or using `npm version` command.
1. Merge `frozen` branch into `master` branch
1. Merge `frozen` branch into `release` branch
1. Enter new release into Github - using the version number created in the third step. Tag name should be `vX.Y.Z` and release name should be `X.Y.Z`.
1. Publish new code to npm using `npm publish` command.
