from danswer.background.update import update__main
from danswer.utils.variable_functionality import global_version


if __name__ == "__main__":
    # mark this as the EE-enabled indexing job
    global_version.set_ee()
    # run the usual flow, any future branching will be done with a
    # call to `global_version.get_is_ee_version()`
    update__main()
