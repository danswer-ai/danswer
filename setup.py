from setuptools import setup, find_packages


setup(
    name="danswer",
    version="0.1.1",  # Update this value as per your package version
    author="Your Name",  # Update this with your name
    author_email="me@igot.ai",  # Update this with your email
    description="API package",  # Add your package description
    packages=find_packages(),
    package_dir={'': 'backend'},
    classifiers=[
        "Development Status :: 3 - Alpha",
        # Choose either "3 - Alpha", "4 - Beta" or "5 - Production/Stable" as the current state of your package
        "Intended Audience :: Developers",  # Define that your audience is developers
        "License :: OSI Approved :: MIT License",  # Again, pick a license
        "Programming Language :: Python :: 3",  # Specify which python versions that you want to support
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
    ]
)
