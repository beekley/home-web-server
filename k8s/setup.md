Before installing K3s, you must enable "cgroups" in the kernel, or K3s will fail to start.

```
sudo nano /boot/firmware/cmdline.txt
# add " cgroup_memory=1 cgroup_enable=memory"
sudo reboot
```

Install K3s:

```
curl -sfL https://get.k3s.io | sh -
```
