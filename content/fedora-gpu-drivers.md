---
title: Installing GPU Drivers on Fedora (NVIDIA, AMD, Intel)
date: 2026-08-11
tags: [fedora, linux, nvidia, drivers]
excerpt: A clean walkthrough for getting your GPU properly recognized on Fedora — RPM Fusion, akmod-nvidia, Secure Boot signing, and how to verify it actually worked.
---

## Overview

Setting up GPU drivers on Fedora Workstation can be tricky, especially with Secure Boot enabled.

### 1. Enable RPM Fusion

```bash
sudo dnf install https://mirrors.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm https://mirrors.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm
```

### 2. Install NVIDIA Driver

```bash
sudo dnf install akmod-nvidia xorg-x11-drv-nvidia-cuda
```
